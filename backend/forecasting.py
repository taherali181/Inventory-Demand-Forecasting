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

from config import DATA_DIR
from features import FEATURE_COLUMNS, engineer_date_features
from models import ForecastPrediction, ForecastRun, ForecastStatus, SalesRecord

logger = logging.getLogger(__name__)

MODEL_DIR = DATA_DIR / "models"
MIN_HISTORY_ROWS = 10
VALID_MODEL_TYPES = {"moving_average", "random_forest", "exponential_smoothing"}


class InsufficientHistoryError(ValueError):
    pass


def _load_history(db: Session, product_id: int, warehouse_id: int) -> pd.DataFrame:
    records = (
        db.query(SalesRecord)
        .filter(SalesRecord.product_id == product_id, SalesRecord.warehouse_id == warehouse_id)
        .order_by(SalesRecord.date)
        .all()
    )
    if len(records) < MIN_HISTORY_ROWS:
        raise InsufficientHistoryError(
            f"Need at least {MIN_HISTORY_ROWS} historical sales_records rows for this product/warehouse "
            f"to forecast; found {len(records)}."
        )
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


def create_forecast_run(
    db: Session,
    product_id: int,
    warehouse_id: int,
    model_type: str,
    forecast_horizon: int,
    created_by: Optional[int] = None,
) -> ForecastRun:
    if model_type not in VALID_MODEL_TYPES:
        raise ValueError(f"Unknown model_type '{model_type}'; must be one of {sorted(VALID_MODEL_TYPES)}.")
    if forecast_horizon < 1:
        raise ValueError("forecast_horizon must be at least 1.")

    run = ForecastRun(
        product_id=product_id,
        warehouse_id=warehouse_id,
        model_type=model_type,
        forecast_horizon=forecast_horizon,
        status=ForecastStatus.pending,
        created_by=created_by,
    )
    db.add(run)
    db.flush()  # assigns run.id, needed below, without committing yet

    try:
        history = _load_history(db, product_id, warehouse_id)

        if model_type == "moving_average":
            predictions, rmse, mae, model = _forecast_moving_average(history, forecast_horizon)
        elif model_type == "random_forest":
            predictions, rmse, mae, model = _forecast_random_forest(history, forecast_horizon)
        else:
            predictions, rmse, mae, model = _forecast_exponential_smoothing(history, forecast_horizon)

        future_dates = _future_dates(history["date"].max(), forecast_horizon)
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

    except InsufficientHistoryError:
        run.status = ForecastStatus.failed
        db.commit()
        raise
    except Exception:
        run.status = ForecastStatus.failed
        db.commit()
        logger.exception("Forecast run %s failed", run.id)
        raise

    db.commit()
    db.refresh(run)
    return run
