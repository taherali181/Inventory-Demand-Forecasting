# tests/test_features.py
import datetime as dt

import pandas as pd
import pytest

from features import engineer_date_features


def test_holiday_country_defaults_to_settings_value():
    # 2024-01-26 is Republic Day in India (settings.holiday_country
    # defaults to "IN") but an ordinary weekday everywhere else relevant
    # here — a good date to distinguish "IN" from "US" behavior.
    dates = pd.Series([pd.Timestamp("2024-01-26")])
    result = engineer_date_features(dates)
    assert result["holidays"].iloc[0] == 1


def test_holiday_country_override_changes_the_result():
    dates = pd.Series([pd.Timestamp("2024-01-26")])  # not a US holiday
    india = engineer_date_features(dates, country="IN")
    us = engineer_date_features(dates, country="US")
    assert india["holidays"].iloc[0] == 1
    assert us["holidays"].iloc[0] == 0

    # 2024-07-04 (US Independence Day) is the reverse case: a US holiday,
    # not an Indian one.
    july_4th = pd.Series([pd.Timestamp("2024-07-04")])
    assert engineer_date_features(july_4th, country="US")["holidays"].iloc[0] == 1
    assert engineer_date_features(july_4th, country="IN")["holidays"].iloc[0] == 0


def test_invalid_holiday_country_raises_a_clear_error():
    dates = pd.Series([pd.Timestamp("2024-01-01")])
    with pytest.raises(NotImplementedError):
        engineer_date_features(dates, country="ZZ")
