# routers/eda.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import UploadHistory

router = APIRouter(tags=["eda"])


@router.get("/eda")
def get_eda(upload_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Returns the cached EDA results (see upload_processing.py) for a
    specific upload (?upload_id=), or by default the most recently
    uploaded dataset — a DB-backed, per-upload successor to the old
    app.state.data_path global, which was a single shared in-process
    variable the next upload would silently clobber (see CLAUDE.md)."""
    if upload_id is not None:
        record = db.get(UploadHistory, upload_id)
    else:
        record = db.query(UploadHistory).order_by(UploadHistory.uploaded_at.desc()).first()

    if record is None:
        raise HTTPException(status_code=404, detail="No data uploaded yet. POST a CSV to /upload first.")
    if record.status == "processing":
        return JSONResponse(
            status_code=202,
            content={"status": "processing", "upload_id": record.id},
        )
    if record.status == "failed":
        raise HTTPException(status_code=500, detail=record.error_message or "EDA failed.")

    return record.eda_results
