# data_processing.py
import logging
import time

import holidays
import numpy as np
import pandas as pd

from config import PROCESSED_DATA_PATH

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

    # Split date into year, month, day and rebuild as a real datetime column.
    try:
        parts = data["date"].str.split("-", n=3, expand=True)
        data["year"] = parts[0].astype(int)
        data["month"] = parts[1].astype(int)
        data["day"] = parts[2].astype(int)
        data["date"] = pd.to_datetime(data[["year", "month", "day"]])
    except Exception as exc:
        raise ValueError(f"Could not parse 'date' column (expected YYYY-MM-DD): {exc}") from exc

    # Weekend flag
    data["weekend"] = (data["date"].dt.weekday > 4).astype(int)

    # Holiday flag (India calendar — hardcoded for now, see backlog for making this configurable)
    india_holidays = holidays.country_holidays("IN")
    data["holidays"] = data["date"].isin(india_holidays).astype(int)

    # Cyclical month encoding
    data["m1"] = np.sin(data["month"] * (2 * np.pi / 12))
    data["m2"] = np.cos(data["month"] * (2 * np.pi / 12))

    # Day-of-week
    data["weekday"] = data["date"].dt.weekday

    data.drop("date", axis=1, inplace=True)

    PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(PROCESSED_DATA_PATH, index=False)

    logger.info(
        "Processed %d rows into %s in %.2fs",
        len(data),
        PROCESSED_DATA_PATH,
        time.time() - start_time,
    )

    return str(PROCESSED_DATA_PATH)
