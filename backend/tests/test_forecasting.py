# tests/test_forecasting.py
import pandas as pd
from forecasting import moving_average_forecast, advanced_forecasting

def test_moving_average_forecast():
    data = pd.DataFrame({"sales": [100, 150, 200, 250, 300]})
    result = moving_average_forecast(data)
    assert len(result) == len(data)

def test_advanced_forecasting():
    data = pd.DataFrame({"date": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04", "2023-01-05"], "sales": [100, 150, 200, 250, 300]})
    predictions = advanced_forecasting(data)
    assert len(predictions) == len(data) * 0.2  # Since 20% test split