# main.py
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from chatbot import app as chatbot_app
from config import CORS_ALLOWED_ORIGINS
from rate_limit import limiter
from routers import alerts, auth, eda, forecast, products, purchase_orders, stock, suppliers, upload, warehouses

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Schema is managed by Alembic now (backend/alembic/), not Base.metadata.
# create_all() here — run `alembic upgrade head` before starting the app
# (backend-ci.yml and docker-compose.yml both do this; see also
# backend/tests/conftest.py's db_session fixture, which deliberately keeps
# using create_all() against an isolated per-test SQLite file for speed —
# a documented divergence from how the real app initializes its schema).

app = FastAPI(title="Inventory Forecasting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: a strict per-route limit is applied directly to
# /auth/login and /auth/register (see routers/auth.py) to blunt credential
# stuffing/brute force. The chatbot sub-app (a separate FastAPI() instance,
# see chatbot.py) deliberately isn't covered — it's slated for removal
# rather than hardening.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(forecast.router)
app.include_router(eda.router)
app.include_router(warehouses.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(alerts.router)
app.include_router(purchase_orders.router)
app.mount("/chatbot", chatbot_app)
