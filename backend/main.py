# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import CORS_ALLOWED_ORIGINS
from logging_config import configure_logging
from rate_limit import limiter
from routers import (
    alerts,
    auth,
    dashboard,
    eda,
    forecast,
    health,
    products,
    purchase_orders,
    reorder,
    stock,
    suppliers,
    upload,
    users,
    warehouses,
)

configure_logging()

# Schema is managed by Alembic now (backend/alembic/), not Base.metadata.
# create_all() here — run `alembic upgrade head` before starting the app
# (backend-ci.yml and docker-compose.yml both do this; see also
# backend/tests/conftest.py's db_session fixture, which deliberately keeps
# using create_all() against an isolated per-test SQLite file for speed —
# a documented divergence from how the real app initializes its schema).

app = FastAPI(title="Restock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: a strict per-route limit is applied directly to
# /auth/login and /auth/register (see routers/auth.py) to blunt credential
# stuffing/brute force.
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
app.include_router(reorder.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(health.router)

# Exposes GET /metrics in Prometheus exposition format (request counts,
# latencies, etc.) — one line, no per-endpoint instrumentation needed.
Instrumentator().instrument(app).expose(app)
