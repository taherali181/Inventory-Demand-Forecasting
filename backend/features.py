# features.py
"""Shared date-derived feature engineering, used by both the CSV upload
pipeline (data_processing.py, feeding EDA) and the DB-driven forecasting
pipeline (forecasting.py). Deliberately not persisted anywhere — recomputed
on demand so a change here never requires a data migration.
"""
import holidays
import numpy as np
import pandas as pd

from config import settings

FEATURE_COLUMNS = ["year", "month", "day", "weekday", "weekend", "holidays", "m1", "m2"]

# Lag/rolling features, used only by forecasting.py's RandomForest path (not
# by the EDA/data_processing.py path, which has no per-pair sales series to
# lag against — see forecasting._build_lag_rolling_features for where these
# actually get computed). Kept here so FEATURE_COLUMNS + LAG_FEATURE_COLUMNS
# together are the single list callers need to build model input.
LAG_FEATURE_COLUMNS = ["lag_1", "lag_7", "rolling_mean_7", "rolling_mean_28"]


def engineer_date_features(dates: pd.Series, country: str | None = None) -> pd.DataFrame:
    """Given a Series of datetime64 dates, return a DataFrame of engineered
    features aligned to the same index: year, month, day, weekday, a weekend
    flag, a holiday flag, and a cyclical (sin/cos) month encoding.

    `country` is an ISO 3166-1 alpha-2 code passed to the `holidays` package
    (e.g. "IN", "US"); defaults to `config.settings.holiday_country`. Raises
    `ValueError` via the `holidays` package itself if the code isn't
    supported.
    """
    dates = pd.to_datetime(dates)

    # Two gotchas here, both real (verified against actual output, not
    # assumed) and both present since before this function took a `country`
    # argument at all — this used to silently compute an all-zero
    # "holidays" column no matter the date:
    #   1. `holidays.country_holidays(...)` is lazily populated per year on
    #      first access; pandas' `Series.isin()` builds its comparison set
    #      by iterating the object directly, which never triggers that
    #      lazy expansion (unlike Python's `in` operator, which does).
    #      Passing `years=` eagerly populates the years actually present in
    #      `dates`, so `isin()` has something real to compare against.
    #   2. `holidays`'s keys are plain `datetime.date`, while `dates` is
    #      datetime64/Timestamp — `.isin()` treats these as unequal even
    #      for the same calendar day, so the dates side must be reduced to
    #      `.dt.date` too before comparing.
    years = dates.dt.year.unique().tolist()
    country_holidays = holidays.country_holidays(country or settings.holiday_country, years=years)
    holiday_dates = dates.dt.date
    return pd.DataFrame(
        {
            "year": dates.dt.year,
            "month": dates.dt.month,
            "day": dates.dt.day,
            "weekday": dates.dt.weekday,
            "weekend": (dates.dt.weekday > 4).astype(int),
            "holidays": holiday_dates.isin(country_holidays).astype(int),
            "m1": np.sin(dates.dt.month * (2 * np.pi / 12)),
            "m2": np.cos(dates.dt.month * (2 * np.pi / 12)),
        },
        index=dates.index,
    )
