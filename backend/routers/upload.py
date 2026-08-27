# routers/upload.py
import logging
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from data_processing import upload_and_validate_csv
from database import get_db
from eda import perform_eda
from ingest import persist_sales_records
from models import UploadHistory, User
from routers.auth import get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    try:
        data_path = upload_and_validate_csv(file.file)
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

    # The database is now the source of truth for inventory records (this is
    # what auto-creates warehouses/products from store/item ids). The CSV
    # snapshot below is kept purely so the existing forecasting/EDA pipeline
    # keeps working unchanged until Phase 5 rewrites it to query the DB
    # directly instead of a file path.
    processed = pd.read_csv(data_path)
    rows_persisted = persist_sales_records(db, processed)

    db.add(
        UploadHistory(
            filename=file.filename,
            uploaded_by=current_user.id if current_user else None,
            row_count=len(processed),
            status="completed",
        )
    )
    db.commit()

    try:
        eda_results = perform_eda(data_path)
    except Exception as exc:
        logger.exception("Upload succeeded but EDA failed")
        raise HTTPException(status_code=500, detail="File uploaded, but EDA failed.") from exc

    # Single shared "current dataset" for the whole process — a stand-in for
    # per-user persistence. The DB write above is per-record and permanent;
    # this just tracks which CSV snapshot /forecast and /eda should read.
    request.app.state.data_path = data_path

    return {
        "message": "File uploaded and processed successfully.",
        "data_path": data_path,
        "rows_persisted": rows_persisted,
        "eda": eda_results,
    }
