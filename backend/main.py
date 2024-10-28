# main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from data_processing import upload_and_validate_csv
from forecasting import moving_average_forecast, advanced_forecasting
from chatbot import app as chatbot_app
from eda import perform_eda
import os
import pandas as pd

app = FastAPI()
app.mount("/chatbot", chatbot_app)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global data
    data = upload_and_validate_csv(file.file)
    if data is not None:
        perform_eda(data)
        return {"message": "File uploaded and EDA performed successfully."}
    return {"error": "Failed to upload file."}

@app.get("/forecast")
async def forecast(forecast_horizon: int = 7):
    if 'data' not in globals():
        return {"error": "No data uploaded yet."}
    predictions = advanced_forecasting(data)
    return predictions.tolist()

@app.get("/")
async def serve_frontend():
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "index.html")
    return FileResponse(frontend_path)
