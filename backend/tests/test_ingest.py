# tests/test_ingest.py
import pandas as pd

from ingest import persist_sales_records
from models import Product, SalesRecord, Warehouse


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
