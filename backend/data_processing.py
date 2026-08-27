# data_processing.py
import logging
import time

import pandas as pd

from config import PROCESSED_DATA_PATH
from features import engineer_date_features

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ["date", "store", "item", "sales"]


def upload_and_validate_csv(file_obj) -> str:
    """Validate an uploaded sales CSV, engineer forecasting features, and persist it.

    Raises ValueError if the file can't be parsed or is missing required columns
    (callers are expected to turn this into an HTTP 400). Returns the path to the
    processed CSV on success.
    """
    start_time = time.time()

    try:
        data = pd.read_csv(file_obj)
    except Exception as exc:
        raise ValueError(f"Could not read CSV file: {exc}") from exc

    missing = [column for column in REQUIRED_COLUMNS if column not in data.columns]
    if missing:
        raise ValueError(f"CSV file is missing required columns: {', '.join(missing)}")

    data = data[REQUIRED_COLUMNS].copy()

    try:
        dates = pd.to_datetime(data["date"])
    except Exception as exc:
        raise ValueError(f"Could not parse 'date' column (expected YYYY-MM-DD): {exc}") from exc

    data = pd.concat([data.drop(columns=["date"]), engineer_date_features(dates)], axis=1)

    PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(PROCESSED_DATA_PATH, index=False)

    logger.info(
        "Processed %d rows into %s in %.2fs",
        len(data),
        PROCESSED_DATA_PATH,
        time.time() - start_time,
    )

    return str(PROCESSED_DATA_PATH)
