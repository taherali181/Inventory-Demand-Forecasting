# data_processing.py
import pandas as pd
import time
import holidays
import os
import numpy as np

def upload_and_validate_csv(file_path):
    print("reading...")
    try:
        start_time = time.time()
        data = pd.read_csv(file_path)
        # Validate required columns
        required_columns = ['date', 'store', 'item', 'sales']
        if not all(column in data.columns for column in required_columns):
            raise ValueError("CSV file is missing required columns.")
        
        # Filter relevant columns
        data = data[['date', 'store', 'item', 'sales']]

        # Feature engineering
        # Split date into year, month, and day
        parts = data["date"].str.split("-", n=3, expand=True)
        data["year"] = parts[0].astype(int)
        data["month"] = parts[1].astype(int)
        data["day"] = parts[2].astype(int)

        # Convert date into datetime object
        data['date'] = pd.to_datetime(data[['year', 'month', 'day']])

        # Convert year, month, day to integers
        data['year'] = data['year'].astype(int)
        data['month'] = data['month'].astype(int)
        data['day'] = data['day'].astype(int)
        
        
        # Add weekend or weekday feature
        data['weekend'] = data['date'].dt.weekday > 4
        data['weekend'] = data['weekend'].astype(int)

        # Add holiday feature
        india_holidays = holidays.country_holidays('IN')
        data['holidays'] = data['date'].isin(india_holidays).astype(int)

        # Add cyclical month features
      
        data['m1'] = np.sin(data['month'] * (2 * np.pi / 12))
        data['m2'] = np.cos(data['month'] * (2 * np.pi / 12))

        # Add weekday feature
        data['weekday'] = data['date'].dt.weekday
        
        # Drop the original date column
        data.drop('date', axis=1, inplace=True)
        
        # Save the processed data to a temporary CSV file
        temp_csv_path = 'data/processed_data_temp.csv'
        data.to_csv(temp_csv_path, index=False)
        
        end_time = time.time()
        print(f"Processing completed in {end_time - start_time:.2f} seconds.")
        
        return temp_csv_path
    
    except Exception as e:
        print(f"Error: {e}")
        
        # Clean up any temporary file if created
        if 'temp_csv_path' in locals() and os.path.exists(temp_csv_path):
            os.remove(temp_csv_path)
        return None
