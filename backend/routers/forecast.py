# routers/forecast.py
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from forecasting import create_pending_forecast_run, run_forecast_training_in_background
from models import ForecastRun, Product, User, Warehouse
from routers.auth import get_current_user_optional
from schemas import ForecastRequest, ForecastRunRead, PaginatedResponse

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.post("", response_model=ForecastRunRead, status_code=status.HTTP_202_ACCEPTED)
def forecast(
    payload: ForecastRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Creates a `pending` ForecastRun immediately and schedules the actual
    training (see forecasting.py) as a background task, so this returns
    right away instead of blocking the request on model training — poll
    GET /forecast/{id} for the result. Not gated behind login, but
    attributes the run when a token is present."""
    if db.get(Product, payload.product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    if db.get(Warehouse, payload.warehouse_id) is None:
        raise HTTPException(status_code=404, detail="Warehouse not found.")

    try:
        run = create_pending_forecast_run(
            db,
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            model_type=payload.model_type,
            forecast_horizon=payload.forecast_horizon,
            created_by=current_user.id if current_user else None,
            gap_fill_strategy=payload.gap_fill_strategy,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    background_tasks.add_task(run_forecast_training_in_background, run.id)
    return run


@router.get("", response_model=PaginatedResponse[ForecastRunRead])
def list_forecast_runs(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(ForecastRun)
    if product_id is not None:
        query = query.filter(ForecastRun.product_id == product_id)
    if warehouse_id is not None:
        query = query.filter(ForecastRun.warehouse_id == warehouse_id)
    total = query.count()
    items = query.order_by(ForecastRun.trained_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=items, total=total)


@router.get("/{run_id}", response_model=ForecastRunRead)
def get_forecast_run(run_id: int, db: Session = Depends(get_db)):
    """Re-reads a persisted run's predictions without retraining. Poll this
    after POST /forecast until status is no longer "pending"."""
    run = db.get(ForecastRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Forecast run not found.")
    return run
