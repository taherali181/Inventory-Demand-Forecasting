# config.py
"""Central path and environment configuration for the backend.

Kept as plain module-level constants for now; Phase 6 replaces this with
pydantic-settings-based config once .env-driven values (DATABASE_URL, etc.)
are introduced in Phase 1.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DATA_PATH = DATA_DIR / "processed_data_temp.csv"

# Origins allowed to call this API from a browser (the React dev server).
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
