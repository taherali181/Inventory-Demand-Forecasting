# upload_processing.py
"""Background processing for an uploaded CSV: DB persistence (ingest.py)
and EDA chart generation (eda.py), run after routers/upload.py's
synchronous CSV validation step returns. Split out for the same reason as
forecasting.run_forecast_training_in_background: matplotlib chart
rendering plus a full DataFrame's worth of DB upserts are real, non-trivial
work that shouldn't block the HTTP response.

See models.UploadHistory.status for how a caller (GET /eda) finds out
whether this has finished, and CLAUDE.md for why this replaced the old
app.state.data_path global.
"""
import logging

import pandas as pd

import database
from eda import perform_eda
from ingest import persist_sales_records
from models import UploadHistory

logger = logging.getLogger(__name__)


def process_upload_in_background(upload_history_id: int) -> None:
    # database.SessionLocal (module-qualified, not `from database import
    # SessionLocal`) so tests can monkeypatch it to an isolated per-test
    # engine — see forecasting.py's identical pattern and
    # tests/conftest.py's db_session fixture for why a frozen import-time
    # reference wouldn't be patchable.
    db = database.SessionLocal()
    try:
        record = db.get(UploadHistory, upload_history_id)
        if record is None:
            logger.error("process_upload_in_background: UploadHistory %s not found", upload_history_id)
            return

        try:
            processed = pd.read_csv(record.processed_file_path)
            record.row_count = len(processed)
            persist_sales_records(db, processed)  # commits internally

            record.eda_results = perform_eda(record.processed_file_path)
            record.status = "completed"
            db.commit()
        except Exception as exc:
            record.status = "failed"
            record.error_message = str(exc)
            db.commit()
            logger.exception("Upload %s failed during background processing", upload_history_id)
    finally:
        db.close()
