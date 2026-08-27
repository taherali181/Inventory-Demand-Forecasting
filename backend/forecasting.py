# forecasting.py
"""Trains a forecasting model for one (product, warehouse) pair against real
sales_records history in the database, and predicts forecast_horizon days
into the future — a genuine forward-looking forecast, not the old backtest
(train/test split, return predictions on the test rows) this replaces.

Models are persisted via joblib (backend/data/models/{run_id}.joblib) so a
later GET on an existing run re-reads its stored predictions without
retraining — see routers/forecast.py.
"""
import logging
from typing import Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sqlalchemy.orm import Session
from statsmodels.tsa.holtwinters import ExponentialSmoothing

import database
from config import DATA_DIR
from features import FEATURE_COLUMNS, engineer_date_features
from models import ForecastPrediction, ForecastRun, ForecastStatus, SalesRecord

logger = logging.getLogger(__name__)

MODEL_DIR = DATA_DIR / "models"
MIN_HISTORY_ROWS = 10
VALID_MODEL_TYPES = {"moving_average", "random_forest", "exponential_smoothing"}


class InsufficientHistoryError(ValueError):
    pass


def _require_sufficient_history(row_count: int) -> None:
    if row_count < MIN_HISTORY_ROWS:
        raise InsufficientHistoryError(
            f"Need at least {MIN_HISTORY_ROWS} historical sales_records rows for this product/warehouse "
            f"to forecast; found {row_count}."
        )


def _history_row_count(db: Session, product_id: int, warehouse_id: int) -> int:
    return (
        db.query(SalesRecord)
        .filter(SalesRecord.product_id == product_id, SalesRecord.warehouse_id == warehouse_id)
        .count()
    )


def _load_history(db: Session, product_id: int, warehouse_id: int) -> pd.DataFrame:
    records = (
        db.query(SalesRecord)
        .filter(SalesRecord.product_id == product_id, SalesRecord.warehouse_id == warehouse_id)
        .order_by(SalesRecord.date)
        .all()
    )
    _require_sufficient_history(len(records))
    df = pd.DataFrame({"date": [r.date for r in records], "sales": [r.sales for r in records]})
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def _future_dates(last_date: pd.Timestamp, horizon: int) -> pd.DatetimeIndex:
    return pd.date_range(start=last_date + pd.Timedelta(days=1), periods=horizon, freq="D")


def _evaluate(y_true, y_pred) -> Tuple[float, float]:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    return rmse, mae


def _forecast_moving_average(history: pd.DataFrame, horizon: int, window: int = 7):
    window = max(1, min(window, len(history) - 1))

    # Walk-forward evaluation: for every day, predict it as the mean of the
    # `window` days immediately before it (rolling mean shifted by one), then
    # compare against what actually happened. Covers the whole history rather
    # than an arbitrary train/holdout split.
    rolling_pred = history["sales"].rolling(window=window).mean().shift(1)
    eval_df = pd.DataFrame({"actual": history["sales"], "predicted": rolling_pred}).dropna()
    rmse, mae = _evaluate(eval_df["actual"], eval_df["predicted"]) if len(eval_df) > 0 else (None, None)

    forecast_value = float(history["sales"].tail(window).mean())
    return [forecast_value] * horizon, rmse, mae, None


def _forecast_random_forest(history: pd.DataFrame, horizon: int):
    features = engineer_date_features(history["date"])
    X, y = features[FEATURE_COLUMNS], history["sales"]

    holdout_size = max(1, int(len(history) * 0.2))
    X_train, X_holdout = X.iloc[:-holdout_size], X.iloc[-holdout_size:]
    y_train, y_holdout = y.iloc[:-holdout_size], y.iloc[-holdout_size:]

    eval_model = RandomForestRegressor(n_estimators=200, random_state=42)
    eval_model.fit(X_train, y_train)
    rmse, mae = _evaluate(y_holdout, eval_model.predict(X_holdout))

    # Refit on the full history before predicting the future — the holdout
    # split above is purely for the reported rmse/mae, not the final model.
    final_model = RandomForestRegressor(n_estimators=200, random_state=42)
    final_model.fit(X, y)

    future_dates = _future_dates(history["date"].max(), horizon)
    future_features = engineer_date_features(pd.Series(future_dates))
    predictions = final_model.predict(future_features[FEATURE_COLUMNS])
    return predictions.tolist(), rmse, mae, final_model


def _forecast_exponential_smoothing(history: pd.DataFrame, horizon: int):
    series = history.set_index("date")["sales"].asfreq("D").interpolate()

    holdout_size = max(1, min(int(len(series) * 0.2), len(series) - 2))
    train, holdout = series.iloc[:-holdout_size], series.iloc[-holdout_size:]
    eval_model = ExponentialSmoothing(train, trend="add", seasonal=None, initialization_method="estimated").fit()
    rmse, mae = _evaluate(holdout, eval_model.forecast(holdout_size))

    final_model = ExponentialSmoothing(series, trend="add", seasonal=None, initialization_method="estimated").fit()
    predictions = final_model.forecast(horizon)
    return predictions.tolist(), rmse, mae, final_model


def _validate_forecast_params(model_type: str, forecast_horizon: int) -> None:
    if model_type not in VALID_MODEL_TYPES:
        raise ValueError(f"Unknown model_type '{model_type}'; must be one of {sorted(VALID_MODEL_TYPES)}.")
    if forecast_horizon < 1:
        raise ValueError("forecast_horizon must be at least 1.")


def _train_and_predict(db: Session, run: ForecastRun) -> None:
    """Does the actual training/prediction for an already-created `run`
    (status=pending, id assigned), mutating it in place and committing —
    whatever `db` session is passed in. Split out from create_forecast_run
    so the same logic can run either synchronously in-request (see
    create_forecast_run, used directly by non-HTTP callers and tests) or in
    a FastAPI BackgroundTasks callback against its own session (see
    run_forecast_training_in_background, used by POST /forecast) — a
    request-scoped `Depends(get_db)` session isn't safe to keep using once
    the response it belongs to has been sent.
    """
    try:
        history = _load_history(db, run.product_id, run.warehouse_id)

        if run.model_type == "moving_average":
            predictions, rmse, mae, model = _forecast_moving_average(history, run.forecast_horizon)
        elif run.model_type == "random_forest":
            predictions, rmse, mae, model = _forecast_random_forest(history, run.forecast_horizon)
        else:
            predictions, rmse, mae, model = _forecast_exponential_smoothing(history, run.forecast_horizon)

        future_dates = _future_dates(history["date"].max(), run.forecast_horizon)
        for forecast_date, predicted_sales in zip(future_dates, predictions):
            db.add(
                ForecastPrediction(
                    forecast_run_id=run.id,
                    forecast_date=forecast_date.date(),
                    predicted_sales=float(predicted_sales),
                )
            )

        artifact_path = None
        if model is not None:
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            artifact_path = str(MODEL_DIR / f"{run.id}.joblib")
            joblib.dump(model, artifact_path)

        run.status = ForecastStatus.completed
        run.rmse = rmse
        run.mae = mae
        run.model_artifact_path = artifact_path
        db.commit()

    except InsufficientHistoryError:
        run.status = ForecastStatus.failed
        db.commit()
        raise
    except Exception:
        run.status = ForecastStatus.failed
        db.commit()
        logger.exception("Forecast run %s failed", run.id)
        raise


def create_forecast_run(
    db: Session,
    product_id: int,
    warehouse_id: int,
    model_type: str,
    forecast_horizon: int,
    created_by: Optional[int] = None,
) -> ForecastRun:
    """Synchronous, single-session, train-immediately path: creates the run
    and trains it before returning. For direct/programmatic callers (tests,
    scripts) — the HTTP API instead uses create_pending_forecast_run +
    run_forecast_training_in_background so POST /forecast doesn't block the
    request on training. Behaves identically to before this split existed:
    raises on invalid params or insufficient history, returns a completed
    (or raises on failure) run otherwise.
    """
    _validate_forecast_params(model_type, forecast_horizon)

    run = ForecastRun(
        product_id=product_id,
        warehouse_id=warehouse_id,
        model_type=model_type,
        forecast_horizon=forecast_horizon,
        status=ForecastStatus.pending,
        created_by=created_by,
    )
    db.add(run)
    db.flush()  # assigns run.id, needed by _train_and_predict, without committing yet

    _train_and_predict(db, run)

    db.refresh(run)
    return run


def create_pending_forecast_run(
    db: Session,
    product_id: int,
    warehouse_id: int,
    model_type: str,
    forecast_horizon: int,
    created_by: Optional[int] = None,
) -> ForecastRun:
    """Validates params and inserts+commits a status=pending ForecastRun
    immediately, without training. Pair with
    run_forecast_training_in_background(run.id) — typically scheduled via
    FastAPI's BackgroundTasks — to actually train it. Used by POST
    /forecast so the request returns right away instead of blocking on
    model training.

    Insufficient history is still checked here (a cheap COUNT query), not
    deferred to the background task — no reason to accept a request and
    make the caller poll just to learn it was rejected for a reason we
    could tell them synchronously.
    """
    _validate_forecast_params(model_type, forecast_horizon)
    _require_sufficient_history(_history_row_count(db, product_id, warehouse_id))

    run = ForecastRun(
        product_id=product_id,
        warehouse_id=warehouse_id,
        model_type=model_type,
        forecast_horizon=forecast_horizon,
        status=ForecastStatus.pending,
        created_by=created_by,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def run_forecast_training_in_background(run_id: int) -> None:
    """The actual training work for a run already created via
    create_pending_forecast_run — opens its own DB session (deliberately
    NOT reusing the request's, which may already be closed by the time a
    BackgroundTasks callback executes) and hands off to _train_and_predict.
    Exceptions are logged, not raised — there's no request left to
    propagate them to; the run's own `status`/row is the only way a caller
    finds out training failed (poll GET /forecast/{run_id}).

    Accessed as database.SessionLocal (module-qualified), not via
    `from database import SessionLocal`, so tests/conftest.py's db_session
    fixture can monkeypatch database.SessionLocal to an isolated per-test
    engine and have it actually take effect here — a `from ... import`
    would freeze this module's own reference at import time, before any
    test fixture runs, making it unpatchable from outside.
    """
    db = database.SessionLocal()
    try:
        run = db.get(ForecastRun, run_id)
        if run is None:
            logger.error("run_forecast_training_in_background: ForecastRun %s not found", run_id)
            return
        try:
            _train_and_predict(db, run)
        except Exception:
            # _train_and_predict already logs + commits status=failed;
            # this just stops the exception from propagating out of a
            # BackgroundTasks callback, where nothing would catch it.
            pass
    finally:
        db.close()
