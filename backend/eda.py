# eda.py
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

def perform_eda(file_path):
    # Load data from CSV file
    data = pd.read_csv(file_path)
    # Summary statistics
    print("Summary Statistics:")
    print(data.describe())

    # Check for missing values
    missing_values = data.isnull().sum()
    print("\nMissing Values:")
    print(missing_values)

    # Sales trend over time
    data['date'] = pd.to_datetime(data[['year', 'month', 'day']])
    data.set_index('date', inplace=True)

    plt.figure(figsize=(10, 6))
    plt.plot(data['sales'], label='Sales Trend')
    plt.xlabel('Date')
    plt.ylabel('Sales')
    plt.title('Sales Trend Over Time')
    plt.legend()
    plt.show()

    # Calculate and print correlation matrix
    correlation_matrix = data.corr()
    print("\nCorrelation Matrix:")
    print(correlation_matrix)

    # Visualize correlations with a heatmap
    plt.figure(figsize=(10, 6))
    sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', linewidths=0.5)
    plt.title('Correlation Heatmap')
    plt.show()

    # Plot sales distribution
    plt.figure(figsize=(10, 6))
    sns.histplot(data['sales'], kde=True)
    plt.xlabel('Sales')
    plt.title('Sales Distribution')
    plt.show()

    # Boxplot for sales to check for outliers
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=data['sales'])
    plt.title('Sales Boxplot')
    plt.show()

    # Unique stores and items
    print("\nNumber of unique stores:", data['store'].nunique())
    print("Number of unique items:", data['item'].nunique())

    # Add weekend feature based on weekday
    data['weekend'] = data['weekday'].apply(lambda x: 1 if x >= 5 else 0)

    # Plotting sales against various features
    features = ['store', 'year', 'month', 'weekday', 'weekend', 'holidays']
    plt.subplots(figsize=(20, 10))
    for i, col in enumerate(features):
        plt.subplot(2, 3, i + 1)
        data.groupby(col).mean()['sales'].plot.bar()
        plt.title(f'Mean Sales by {col}')
    plt.show()

    # Plot sales by day of the month
    plt.figure(figsize=(10, 5))
    data.groupby('day').mean()['sales'].plot()
    plt.xlabel('Day of Month')
    plt.ylabel('Average Sales')
    plt.title('Average Sales by Day of Month')
    plt.show()

    # Simple Moving Average for sales
    window_size = 30
    data_2013 = data[data['year'] == 2013]
    windows = data_2013['sales'].rolling(window_size)
    sma = windows.mean()
    sma = sma[window_size - 1:]

    plt.figure(figsize=(10, 5))
    data_2013['sales'].plot(label='Sales')
    sma.plot(label='30-Day SMA')
    plt.legend()
    plt.title('Sales and 30-Day Simple Moving Average for 2013')
    plt.show()