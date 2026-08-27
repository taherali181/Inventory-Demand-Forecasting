# routers/upload.py
import logging

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from data_processing import upload_and_validate_csv
from eda import perform_eda

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    try:
        data_path = upload_and_validate_csv(file.file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while processing upload")
        raise HTTPException(status_code=500, detail="Failed to process the uploaded file.") from exc

    try:
        eda_results = perform_eda(data_path)
    except Exception as exc:
        logger.exception("Upload succeeded but EDA failed")
        raise HTTPException(status_code=500, detail="File uploaded, but EDA failed.") from exc

    # Single shared "current dataset" for the whole process — a stand-in for
    # per-user persistence until Phase 1 replaces this with the database.
    request.app.state.data_path = data_path

    return {
        "message": "File uploaded and processed successfully.",
        "data_path": data_path,
        "eda": eda_results,
    }
