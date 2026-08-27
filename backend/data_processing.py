# data_processing.py
import logging
import time

import pandas as pd

from config import PROCESSED_DATA_PATH
from features import engineer_date_features

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ["date", "store", "item", "sales"]


def _validate_rows(data: pd.DataFrame, dates: pd.Series) -> tuple:
    """Row-level validation of store/item/sales, run after the whole-file
    checks (columns present, date column parseable) in upload_and_validate_csv.

    Rejects (drops) a row only when store/item/sales is missing or
    non-numeric — there's no sane value to substitute, and `ingest.py`'s
    `int(row.store)`/`int(row.item)`/`float(row.sales)` would otherwise
    raise an unhandled exception per bad row deep in a background task.
    Negative sales is flagged as a warning, not rejected — it's ambiguous
    (could be a return) rather than clearly invalid, so the decision is
    left to whoever reviews the upload summary, not made silently here.

    Returns (valid_data, valid_dates, summary) where summary is
    {total_rows, valid_rows, rejected_rows, warnings} — persisted on
    UploadHistory.validation_summary and returned in the 202 response so a
    caller sees it immediately, without polling.
    """
    total_rows = len(data)
    warnings = []

    store_numeric = pd.to_numeric(data["store"], errors="coerce")
    item_numeric = pd.to_numeric(data["item"], errors="coerce")
    sales_numeric = pd.to_numeric(data["sales"], errors="coerce")
    valid_mask = store_numeric.notna() & item_numeric.notna() & sales_numeric.notna()

    rejected_rows = int((~valid_mask).sum())
    if rejected_rows:
        warnings.append(
            f"{rejected_rows} row(s) rejected: missing or non-numeric store/item/sales value."
        )

    data = data.loc[valid_mask].copy()
    dates = dates.loc[valid_mask]
    data["store"] = store_numeric.loc[valid_mask].astype(int)
    data["item"] = item_numeric.loc[valid_mask].astype(int)
    data["sales"] = sales_numeric.loc[valid_mask]

    negative_sales_rows = int((data["sales"] < 0).sum())
    if negative_sales_rows:
        warnings.append(
            f"{negative_sales_rows} row(s) have negative sales values — kept as-is; verify whether these "
            "represent returns or bad data."
        )

    summary = {
        "total_rows": total_rows,
        "valid_rows": int(len(data)),
        "rejected_rows": rejected_rows,
        "warnings": warnings,
    }
    return data, dates, summary


def upload_and_validate_csv(file_obj) -> tuple:
    """Validate an uploaded sales CSV, engineer forecasting features, and persist it.

    Raises ValueError if the file can't be parsed, is missing required
    columns, the date column doesn't parse, or every row is rejected by
    row-level validation (callers are expected to turn this into an HTTP
    400). Returns (path_to_processed_csv, validation_summary) on success —
    see _validate_rows for what validation_summary contains.
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

    data, dates, summary = _validate_rows(data, dates)
    if summary["valid_rows"] == 0:
        raise ValueError(
            f"No valid rows found in the uploaded file — all {summary['total_rows']} row(s) were rejected: "
            + "; ".join(summary["warnings"])
        )

    data = pd.concat([data.drop(columns=["date"]), engineer_date_features(dates)], axis=1)

    PROCESSED_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(PROCESSED_DATA_PATH, index=False)

    logger.info(
        "Processed %d/%d rows into %s in %.2fs",
        summary["valid_rows"],
        summary["total_rows"],
        PROCESSED_DATA_PATH,
        time.time() - start_time,
    )

    return str(PROCESSED_DATA_PATH), summary
