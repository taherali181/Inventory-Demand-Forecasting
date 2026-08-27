# routers/upload.py
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from data_processing import upload_and_validate_csv
from database import get_db
from models import UploadHistory, User
from routers.auth import get_current_user_optional
from schemas import UploadAcceptedRead
from upload_processing import process_upload_in_background

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadAcceptedRead, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Validates and feature-engineers the CSV synchronously (fast — needs
    to report a malformed file immediately), then hands DB persistence and
    EDA chart generation off to a background task (see upload_processing.py)
    so the response doesn't block on either. Poll GET /eda?upload_id=<id>
    (the id returned here) for the result."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    try:
        data_path, validation_summary = upload_and_validate_csv(file.file)
    except ValueError as exc:
        db.add(
            UploadHistory(
                filename=file.filename,
                status="failed",
                error_message=str(exc),
                uploaded_by=current_user.id if current_user else None,
            )
        )
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while processing upload")
        raise HTTPException(status_code=500, detail="Failed to process the uploaded file.") from exc

    upload_record = UploadHistory(
        filename=file.filename,
        uploaded_by=current_user.id if current_user else None,
        processed_file_path=data_path,
        validation_summary=validation_summary,
        status="processing",
    )
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    background_tasks.add_task(process_upload_in_background, upload_record.id)

    return upload_record
