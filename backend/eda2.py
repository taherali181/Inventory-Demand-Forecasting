# eda.py
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/perform_eda/")
async def perform_eda(file: UploadFile = File(...)):
    # Load data from CSV file
    data = pd.read_csv(file.file)
    
    # Summary statistics
    summary_statistics = data.describe().to_dict()

    # Check for missing values
    missing_values = data.isnull().sum().to_dict()

    # Sales trend over time
    data['date'] = pd.to_datetime(data[['year', 'month', 'day']])
    data.set_index('date', inplace=True)
    plt.figure(figsize=(10, 6))
    plt.plot(data['sales'], label='Sales Trend')
    plt.xlabel('Date')
    plt.ylabel('Sales')
    plt.title('Sales Trend Over Time')
    plt.legend()
    sales_trend_buffer = io.BytesIO()
    plt.savefig(sales_trend_buffer, format='png')
    sales_trend_buffer.seek(0)
    sales_trend_image = base64.b64encode(sales_trend_buffer.read()).decode('utf-8')
    plt.close()

    # Correlation heatmap
    correlation_matrix = data.corr()
    plt.figure(figsize=(10, 6))
    sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', linewidths=0.5)
    plt.title('Correlation Heatmap')
    correlation_heatmap_buffer = io.BytesIO()
    plt.savefig(correlation_heatmap_buffer, format='png')
    correlation_heatmap_buffer.seek(0)
    correlation_heatmap_image = base64.b64encode(correlation_heatmap_buffer.read()).decode('utf-8')
    plt.close()

    # Sales distribution
    plt.figure(figsize=(10, 6))
    sns.histplot(data['sales'], kde=True)
    plt.xlabel('Sales')
    plt.title('Sales Distribution')
    sales_distribution_buffer = io.BytesIO()
    plt.savefig(sales_distribution_buffer, format='png')
    sales_distribution_buffer.seek(0)
    sales_distribution_image = base64.b64encode(sales_distribution_buffer.read()).decode('utf-8')
    plt.close()

    # Boxplot for sales
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=data['sales'])
    plt.title('Sales Boxplot')
    sales_boxplot_buffer = io.BytesIO()
    plt.savefig(sales_boxplot_buffer, format='png')
    sales_boxplot_buffer.seek(0)
    sales_boxplot_image = base64.b64encode(sales_boxplot_buffer.read()).decode('utf-8')
    plt.close()

    # Return all EDA results as JSON
    return JSONResponse(content={
        "summary_statistics": summary_statistics,
        "missing_values": missing_values,
        "sales_trend_image": sales_trend_image,
        "correlation_heatmap_image": correlation_heatmap_image,
        "sales_distribution_image": sales_distribution_image,
        "sales_boxplot_image": sales_boxplot_image
    })
