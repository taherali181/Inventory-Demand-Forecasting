# main.py
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 -- registers all tables on Base.metadata before create_all()
from chatbot import app as chatbot_app
from config import CORS_ALLOWED_ORIGINS
from database import Base, engine
from routers import auth, eda, forecast, products, stock, suppliers, upload, warehouses

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Auto-creates tables that don't exist yet; safe to call on every startup.
# Swap for Alembic migrations once schema changes need to preserve data
# (tracked for Phase 6 — see the project plan).
Base.metadata.create_all(bind=engine)

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

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(forecast.router)
app.include_router(eda.router)
app.include_router(warehouses.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(stock.router)
app.mount("/chatbot", chatbot_app)
