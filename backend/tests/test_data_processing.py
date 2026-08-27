# tests/test_data_processing.py
"""Tests data_processing.upload_and_validate_csv's row-level validation
(Change 10.7) directly, not just through the /upload HTTP endpoint —
test_api.py covers the end-to-end contract."""
import io

import pandas as pd
import pytest

from data_processing import upload_and_validate_csv


@pytest.fixture(autouse=True)
def isolate_data_path(tmp_path, monkeypatch):
    """Point uploads at a throwaway CSV path — same pattern as
    test_api.py's fixture of the same name — so these tests don't write
    into the real backend/data/processed_data_temp.csv."""
    monkeypatch.setattr("data_processing.PROCESSED_DATA_PATH", tmp_path / "processed_data_temp.csv")


def _csv_bytes(rows) -> io.BytesIO:
    """rows: list of dicts with date/store/item/sales keys (values may be
    strings, including deliberately malformed ones, to exercise validation)."""
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return buf


def _valid_row(i, sales=100):
    return {"date": f"2023-01-{i + 1:02d}", "store": 1, "item": 1, "sales": sales}


def test_all_valid_rows_produce_no_warnings():
    rows = [_valid_row(i) for i in range(12)]
    _path, summary = upload_and_validate_csv(_csv_bytes(rows))
    assert summary == {"total_rows": 12, "valid_rows": 12, "rejected_rows": 0, "warnings": []}


def test_non_numeric_store_is_rejected_not_crashed():
    rows = [_valid_row(i) for i in range(10)]
    rows[3]["store"] = "not-a-number"
    _path, summary = upload_and_validate_csv(_csv_bytes(rows))
    assert summary["total_rows"] == 10
    assert summary["rejected_rows"] == 1
    assert summary["valid_rows"] == 9
    assert "rejected" in summary["warnings"][0]


def test_missing_sales_value_is_rejected():
    rows = [_valid_row(i) for i in range(10)]
    rows[5]["sales"] = ""  # becomes NaN once read back as CSV
    _path, summary = upload_and_validate_csv(_csv_bytes(rows))
    assert summary["rejected_rows"] == 1
    assert summary["valid_rows"] == 9


def test_negative_sales_is_flagged_but_kept():
    rows = [_valid_row(i) for i in range(10)]
    rows[2]["sales"] = -5
    _path, summary = upload_and_validate_csv(_csv_bytes(rows))
    # Not rejected — negative sales is ambiguous (could be a return), so it's
    # kept and only surfaced as a warning, per Change 10.7's approach.
    assert summary["rejected_rows"] == 0
    assert summary["valid_rows"] == 10
    assert any("negative sales" in w for w in summary["warnings"])


def test_mixed_valid_and_invalid_rows_reports_accurate_counts():
    rows = [_valid_row(i) for i in range(20)]
    rows[0]["store"] = "bad"
    rows[1]["item"] = "also-bad"
    rows[2]["sales"] = ""
    rows[3]["sales"] = -1  # invalid-but-kept, not rejected
    _path, summary = upload_and_validate_csv(_csv_bytes(rows))
    assert summary["total_rows"] == 20
    assert summary["rejected_rows"] == 3  # rows 0, 1, 2
    assert summary["valid_rows"] == 17
    assert len(summary["warnings"]) == 2  # one for rejects, one for negative sales


def test_every_row_invalid_raises_value_error():
    rows = [_valid_row(i) for i in range(5)]
    for row in rows:
        row["store"] = "garbage"
    with pytest.raises(ValueError, match="No valid rows"):
        upload_and_validate_csv(_csv_bytes(rows))
