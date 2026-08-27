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


def engine_kwargs_for(database_url: str) -> dict:
    """Pure — no create_engine() call, so tests can check the pool config
    a given URL would get without needing that URL's DBAPI driver actually
    installed (e.g. psycopg2, which this SQLite-by-default app doesn't
    depend on).

    check_same_thread=False is required for SQLite + FastAPI's threadpool;
    it's a no-op (and unrecognized) for other DBAPIs, so only pass it for
    sqlite URLs. pool_pre_ping: cheap (one lightweight round trip before
    checkout) and valuable regardless of backend — catches a connection
    that's gone stale (dropped by the DB server, a load balancer's idle
    timeout, etc.) and transparently reconnects instead of surfacing a
    mid-request error. pool_size/max_overflow only mean something for a
    real server DB with its own connection pool — SQLite's "pool" is a
    single file, so these are passed only for a non-sqlite URL
    (SQLAlchemy's SQLite dialect doesn't accept them alongside the
    file-based pooling it uses instead).
    """
    is_sqlite = database_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine_kwargs = {"connect_args": connect_args, "pool_pre_ping": True}
    if not is_sqlite:
        engine_kwargs["pool_size"] = settings.db_pool_size
        engine_kwargs["max_overflow"] = settings.db_max_overflow
    return engine_kwargs


def build_engine(database_url: str):
    return create_engine(database_url, **engine_kwargs_for(database_url))


engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
