# config.py
"""Centralized settings. DATABASE_URL and JWT_SECRET_KEY are read from the
environment (and a .env file in development, via pydantic-settings) — see
.env.example for the full list and backend/database.py / backend/auth.py for
where these actually get used.
"""
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DATA_PATH = DATA_DIR / "processed_data_temp.csv"

# Referenced by both the Settings default below and auth.py's production
# startup guard — a single source of truth so the two can't drift apart.
DEFAULT_JWT_SECRET_KEY = "dev-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = f"sqlite:///{DATA_DIR / 'inventory.db'}"
    jwt_secret_key: str = DEFAULT_JWT_SECRET_KEY  # MUST be overridden outside local development
    cors_allowed_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # "development" (default) or "production". Sole effect right now: gates
    # the insecure-default-secret startup guard in auth.py.
    environment: str = "development"

    # ISO 3166-1 alpha-2 country code passed to the `holidays` package for
    # the "holidays" feature column in features.py. Validated against
    # holidays.list_supported_countries() at first use, not here, to avoid
    # importing the (large) holidays package at settings-load time.
    holiday_country: str = "IN"

    # Connection pool sizing — only meaningful for a real server DB
    # (Postgres etc.); database.py skips passing these to create_engine()
    # for a sqlite:// URL, where SQLAlchemy's pooling doesn't apply the
    # same way. See database.py for how these are actually used.
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Email notifications for newly-opened low-stock alerts (see
    # notifications.py). Empty by default — recompute_alerts only schedules
    # a send when this is non-empty AND at least one alert was newly
    # opened, so nothing is sent (or attempted) out of the box.
    alert_notification_emails: List[str] = []
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_from_address: str = "alerts@inventory-forecasting.local"
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True


settings = Settings()

# Kept as a module-level name for the handful of call sites that import it
# directly (main.py); everything else should prefer `from config import settings`.
CORS_ALLOWED_ORIGINS = settings.cors_allowed_origins
