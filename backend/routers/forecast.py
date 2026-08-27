# routers/forecast.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from forecasting import InsufficientHistoryError, create_forecast_run
from models import ForecastRun, Product, User, Warehouse
from routers.auth import get_current_user_optional
from schemas import ForecastRequest, ForecastRunRead

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.post("", response_model=ForecastRunRead, status_code=status.HTTP_201_CREATED)
def forecast(
    payload: ForecastRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Train a fresh model and predict `forecast_horizon` real future days for
    one (product, warehouse) pair — see forecasting.create_forecast_run.
    Not gated behind login, but attributes the run when a token is present."""
    if db.get(Product, payload.product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    if db.get(Warehouse, payload.warehouse_id) is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")

    try:
        return create_forecast_run(
            db,
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            model_type=payload.model_type,
            forecast_horizon=payload.forecast_horizon,
            created_by=current_user.id if current_user else None,
        )
    except (InsufficientHistoryError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=List[ForecastRunRead])
def list_forecast_runs(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ForecastRun)
    if product_id is not None:
        query = query.filter(ForecastRun.product_id == product_id)
    if warehouse_id is not None:
        query = query.filter(ForecastRun.warehouse_id == warehouse_id)
    return query.order_by(ForecastRun.trained_at.desc()).all()


@router.get("/{run_id}", response_model=ForecastRunRead)
def get_forecast_run(run_id: int, db: Session = Depends(get_db)):
    """Re-reads a persisted run's predictions without retraining."""
    run = db.get(ForecastRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Forecast run not found.")
    return run
