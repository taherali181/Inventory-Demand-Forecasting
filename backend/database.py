# database.py
"""SQLAlchemy engine/session setup.

DATABASE_URL is env-driven so swapping to Postgres later is a one-line change
(e.g. postgresql+psycopg2://user:pass@host/db) — nothing here or in models.py
is SQLite-specific.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import DATA_DIR

DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR / 'inventory.db'}")

# check_same_thread=False is required for SQLite + FastAPI's threadpool; it's a
# no-op (and unrecognized) for other DBAPIs, so only pass it for sqlite URLs.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
