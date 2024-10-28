# forecasting.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error

def moving_average_forecast(file_path, window=3):
    data = pd.read_csv(file_path)
    return data['sales'].rolling(window=window).mean()

def advanced_forecasting(file_path):
    data = pd.read_csv(file_path)
    # Preparing the data
    features = data[['store', 'item', 'year', 'month', 'day', 'weekday', 'weekend', 'holidays', 'm1', 'm2']]
    target = data['sales']

    # Splitting the dataset
    X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42)

    # Training the model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Making predictions
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    print(f"Mean Squared Error: {mse}")

    return predictions
