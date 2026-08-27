# forecasting.py
import logging

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = ["store", "item", "year", "month", "day", "weekday", "weekend", "holidays", "m1", "m2"]


def moving_average_forecast(file_path, window: int = 3):
    data = pd.read_csv(file_path)
    return data["sales"].rolling(window=window).mean()


def advanced_forecasting(file_path):
    """Train a RandomForestRegressor and return predictions on a held-out split.

    NOTE: this is a backtest over historical data, not a real forward-looking
    forecast — forecast_horizon is not yet used to bound predictions. This is
    the known issue slated to be fixed in Phase 5 (real future-date prediction
    + model persistence).
    """
    data = pd.read_csv(file_path)
    features = data[FEATURE_COLUMNS]
    target = data["sales"]

    X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    logger.info("Advanced forecasting MSE: %.4f", mse)

    return predictions
