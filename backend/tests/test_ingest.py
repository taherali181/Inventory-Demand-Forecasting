# tests/test_ingest.py
from contextlib import contextmanager

import pandas as pd
from sqlalchemy import event

from ingest import persist_sales_records
from models import Product, SalesRecord, Warehouse


@contextmanager
def _count_queries(db):
    count = 0

    def _increment(*_args, **_kwargs):
        nonlocal count
        count += 1

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", _increment)
    try:
        yield lambda: count
    finally:
        event.remove(engine, "before_cursor_execute", _increment)


def _sample_df():
    return pd.DataFrame(
        {
            "store": [1, 1, 2],
            "item": [10, 11, 10],
            "year": [2023, 2023, 2023],
            "month": [1, 1, 1],
            "day": [1, 2, 1],
            "sales": [100.0, 150.0, 200.0],
        }
    )


def test_persist_sales_records_creates_warehouses_and_products(db_session):
    db = db_session()
    try:
        written = persist_sales_records(db, _sample_df())
        assert written == 3
        assert db.query(Warehouse).count() == 2  # STORE-1, STORE-2
        assert db.query(Product).count() == 2  # ITEM-10, ITEM-11
        assert db.query(SalesRecord).count() == 3
    finally:
        db.close()


def test_persist_sales_records_is_idempotent(db_session):
    db = db_session()
    try:
        persist_sales_records(db, _sample_df())
        written_again = persist_sales_records(db, _sample_df())
        assert written_again == 0
        assert db.query(SalesRecord).count() == 3
    finally:
        db.close()


def test_persist_sales_records_query_count_does_not_scale_with_row_count(db_session):
    """Regression test for the N+1 fixed in Phase 8 (Change 8.5).

    INSERTs for genuinely new rows are normal per-row ORM behavior and DO
    legitimately scale 1:1 with row count (that's not the bug) — so this
    isolates just the fixed part by re-uploading the *same* data a second
    time, where every row is a duplicate and nothing gets written. With no
    per-row inserts happening, query count in that second call should stay
    flat regardless of row count; the old per-row existence check would
    instead have scaled with it even with zero rows actually written."""
    db = db_session()
    try:
        small_dates = pd.date_range("2023-01-01", periods=5)
        small_df = pd.DataFrame(
            {
                "store": [1] * 5,
                "item": [1] * 5,
                "year": small_dates.year,
                "month": small_dates.month,
                "day": small_dates.day,
                "sales": [100.0] * 5,
            }
        )
        persist_sales_records(db, small_df)  # first pass: real inserts, not measured
        with _count_queries(db) as small_count:
            written = persist_sales_records(db, small_df)  # second pass: all duplicates
        assert written == 0
        small_queries = small_count()

        large_dates = pd.date_range("2024-01-01", periods=200)
        large_df = pd.DataFrame(
            {
                "store": [2] * 200,
                "item": [2] * 200,
                "year": large_dates.year,
                "month": large_dates.month,
                "day": large_dates.day,
                "sales": [100.0] * 200,
            }
        )
        persist_sales_records(db, large_df)  # first pass: real inserts, not measured
        with _count_queries(db) as large_count:
            written = persist_sales_records(db, large_df)  # second pass: all duplicates
        assert written == 0
        large_queries = large_count()

        # 40x the rows (200 vs 5), all duplicates either time, should NOT
        # mean anywhere near 40x the queries — the old per-row existence
        # check would have, even though nothing was actually written.
        assert large_queries < small_queries * 3
    finally:
        db.close()
