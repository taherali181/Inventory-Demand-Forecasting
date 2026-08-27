# routers/health.py
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(response: Response, db: Session = Depends(get_db)):
    """Trivial liveness/readiness check — a real `SELECT 1` against the
    configured database, not just "the process is running". Returns 200
    with db: "ok" when the DB answers, 503 with db: "unreachable"
    otherwise (still valid JSON either way, not an unhandled 500)."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "unreachable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {"status": "ok" if db_status == "ok" else "degraded", "db": db_status}
