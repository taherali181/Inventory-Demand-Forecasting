# features.py
"""Shared date-derived feature engineering, used by both the CSV upload
pipeline (data_processing.py, feeding EDA) and the DB-driven forecasting
pipeline (forecasting.py). Deliberately not persisted anywhere — recomputed
on demand so a change here never requires a data migration.
"""
import holidays
import numpy as np
import pandas as pd

FEATURE_COLUMNS = ["year", "month", "day", "weekday", "weekend", "holidays", "m1", "m2"]


def engineer_date_features(dates: pd.Series) -> pd.DataFrame:
    """Given a Series of datetime64 dates, return a DataFrame of engineered
    features aligned to the same index: year, month, day, weekday, a weekend
    flag, a holiday flag (India calendar — hardcoded for now, see backlog for
    making this configurable), and a cyclical (sin/cos) month encoding.
    """
    dates = pd.to_datetime(dates)
    india_holidays = holidays.country_holidays("IN")
    return pd.DataFrame(
        {
            "year": dates.dt.year,
            "month": dates.dt.month,
            "day": dates.dt.day,
            "weekday": dates.dt.weekday,
            "weekend": (dates.dt.weekday > 4).astype(int),
            "holidays": dates.isin(india_holidays).astype(int),
            "m1": np.sin(dates.dt.month * (2 * np.pi / 12)),
            "m2": np.cos(dates.dt.month * (2 * np.pi / 12)),
        },
        index=dates.index,
    )
