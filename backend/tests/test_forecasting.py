# tests/test_forecasting.py
import pandas as pd
import pytest

from data_processing import upload_and_validate_csv
from forecasting import advanced_forecasting, moving_average_forecast


@pytest.fixture
def processed_csv(tmp_path, monkeypatch):
    """Build a raw sales CSV and run it through the real upload/validation
    pipeline, returning the path to the resulting feature-engineered CSV.

    Using the real pipeline (rather than hand-building engineered columns)
    keeps this test honest about what forecasting.py actually receives.
    """
    raw = pd.DataFrame(
        {
            "date": pd.date_range("2023-01-01", periods=30).strftime("%Y-%m-%d"),
            "store": [1, 2] * 15,
            "item": ([1, 2, 3] * 10),
            "sales": [100 + i * 5 for i in range(30)],
        }
    )
    raw_path = tmp_path / "raw.csv"
    raw.to_csv(raw_path, index=False)

    processed_path = tmp_path / "processed.csv"
    monkeypatch.setattr("data_processing.PROCESSED_DATA_PATH", processed_path)

    with open(raw_path) as f:
        result_path = upload_and_validate_csv(f)

    assert result_path == str(processed_path)
    return result_path


def test_moving_average_forecast(processed_csv):
    result = moving_average_forecast(processed_csv, window=3)
    assert len(result) == 30
    # First window-1 values are NaN (nothing to average yet); rolling mean kicks in after.
    assert result.isna().sum() == 2


def test_advanced_forecasting(processed_csv):
    data = pd.read_csv(processed_csv)
    predictions = advanced_forecasting(processed_csv)
    assert len(predictions) == round(len(data) * 0.2)


def test_upload_and_validate_csv_rejects_missing_columns(tmp_path):
    bad = pd.DataFrame({"date": ["2023-01-01"], "sales": [10]})
    bad_path = tmp_path / "bad.csv"
    bad.to_csv(bad_path, index=False)

    with pytest.raises(ValueError, match="missing required columns"):
        with open(bad_path) as f:
            upload_and_validate_csv(f)


def test_upload_and_validate_csv_rejects_bad_dates(tmp_path):
    bad = pd.DataFrame(
        {"date": ["not-a-date"], "store": [1], "item": [1], "sales": [10]}
    )
    bad_path = tmp_path / "bad_dates.csv"
    bad.to_csv(bad_path, index=False)

    with pytest.raises(ValueError, match="Could not parse 'date'"):
        with open(bad_path) as f:
            upload_and_validate_csv(f)
