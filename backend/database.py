# database.py
"""SQLAlchemy engine/session setup.

DATABASE_URL (config.settings.database_url) is env-driven so swapping to
Postgres later is a one-line change (e.g. postgresql+psycopg2://user:pass@
host/db) — nothing here or in models.py is SQLite-specific.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import DATA_DIR, settings

DATA_DIR.mkdir(parents=True, exist_ok=True)

# check_same_thread=False is required for SQLite + FastAPI's threadpool; it's a
# no-op (and unrecognized) for other DBAPIs, so only pass it for sqlite URLs.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
