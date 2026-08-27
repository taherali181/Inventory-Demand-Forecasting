# tests/test_database.py
"""Tests database.engine_kwargs_for's pool configuration (Change 10.8)
directly. Deliberately doesn't call build_engine()/create_engine() with a
non-sqlite URL — that would try to import psycopg2, which this SQLite-by-
default app doesn't depend on and isn't installed."""
from database import build_engine, engine_kwargs_for


def test_sqlite_gets_pre_ping_and_thread_arg_but_no_pool_size():
    kwargs = engine_kwargs_for("sqlite:///:memory:")
    assert kwargs["pool_pre_ping"] is True
    assert kwargs["connect_args"] == {"check_same_thread": False}
    assert "pool_size" not in kwargs
    assert "max_overflow" not in kwargs


def test_non_sqlite_gets_configured_pool_size_and_no_thread_arg():
    kwargs = engine_kwargs_for("postgresql+psycopg2://user:pass@localhost/dbname")
    assert kwargs["pool_pre_ping"] is True
    assert kwargs["connect_args"] == {}
    assert kwargs["pool_size"] == 5  # settings.db_pool_size default
    assert kwargs["max_overflow"] == 10  # settings.db_max_overflow default


def test_sqlite_engine_actually_builds_with_pre_ping():
    # The one real create_engine() call this file makes — sqlite:// doesn't
    # need an extra DBAPI package, so this exercises build_engine() itself,
    # not just the pure kwargs function above.
    engine = build_engine("sqlite:///:memory:")
    assert engine.pool._pre_ping is True
