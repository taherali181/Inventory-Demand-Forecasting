# main.py
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from chatbot import app as chatbot_app
from config import CORS_ALLOWED_ORIGINS
from routers import eda, forecast, upload

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Inventory Forecasting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the most recently uploaded/processed dataset. Single-tenant stopgap
# (was a bare global before) — replaced by per-user records in the database
# once Phase 1 lands.
app.state.data_path = None

app.include_router(upload.router)
app.include_router(forecast.router)
app.include_router(eda.router)
app.mount("/chatbot", chatbot_app)

# Legacy static Bootstrap frontend. Slated for removal in Phase 2 once the
# React app is rebuilt and becomes the one real frontend.
_FRONTEND_INDEX = os.path.join(os.path.dirname(__file__), "frontend", "index.html")


@app.get("/")
async def serve_frontend():
    return FileResponse(_FRONTEND_INDEX)
