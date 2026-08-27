# routers/eda.py
import logging

from fastapi import APIRouter, HTTPException, Request

from eda import perform_eda

logger = logging.getLogger(__name__)
router = APIRouter(tags=["eda"])


@router.get("/eda")
async def get_eda(request: Request):
    """Re-run EDA over the currently-uploaded dataset without re-uploading it."""
    data_path = getattr(request.app.state, "data_path", None)
    if data_path is None:
        raise HTTPException(status_code=404, detail="No data uploaded yet. POST a CSV to /upload first.")

    try:
        return perform_eda(data_path)
    except Exception as exc:
        logger.exception("EDA failed")
        raise HTTPException(status_code=500, detail="EDA failed.") from exc
