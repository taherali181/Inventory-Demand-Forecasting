# routers/forecast.py
import logging

from fastapi import APIRouter, HTTPException, Request

from forecasting import advanced_forecasting

logger = logging.getLogger(__name__)
router = APIRouter(tags=["forecast"])


@router.get("/forecast")
async def forecast(request: Request, forecast_horizon: int = 7):
    data_path = getattr(request.app.state, "data_path", None)
    if data_path is None:
        raise HTTPException(status_code=404, detail="No data uploaded yet. POST a CSV to /upload first.")

    try:
        predictions = advanced_forecasting(data_path)
    except Exception as exc:
        logger.exception("Forecasting failed")
        raise HTTPException(status_code=500, detail="Forecasting failed.") from exc

    # NOTE: forecast_horizon is echoed back but not yet load-bearing — advanced_forecasting()
    # currently returns a backtest over the historical train/test split, not a genuine
    # `forecast_horizon`-length prediction of future dates. Fixed in Phase 5.
    return {"forecast_horizon": forecast_horizon, "predictions": predictions.tolist()}
