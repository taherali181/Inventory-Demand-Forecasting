# ingest.py
"""Bridges the legacy CSV `store`/`item` schema into real inventory records.

On ingest, `store` and `item` values are auto-upserted into `warehouses` and
`products` (placeholder names, source='legacy_import') rather than requiring
SKUs/warehouses to exist ahead of time. This reconciles "historical sales CSV
in the Kaggle store/item format" with the real inventory schema.
"""
import logging
from typing import Dict

import pandas as pd
from sqlalchemy.orm import Session

from models import Product, SalesRecord, SalesRecordSource, Warehouse

logger = logging.getLogger(__name__)


def _get_or_create_warehouse(db: Session, store_id: int) -> Warehouse:
    code = f"STORE-{store_id}"
    warehouse = db.query(Warehouse).filter(Warehouse.code == code).first()
    if warehouse is None:
        warehouse = Warehouse(name=f"Store {store_id}", code=code)
        db.add(warehouse)
        db.flush()  # assigns warehouse.id without committing the transaction
    return warehouse


def _get_or_create_product(db: Session, item_id: int) -> Product:
    sku_code = f"ITEM-{item_id}"
    product = db.query(Product).filter(Product.sku_code == sku_code).first()
    if product is None:
        product = Product(sku_code=sku_code, name=f"Item {item_id}")
        db.add(product)
        db.flush()
    return product


def persist_sales_records(db: Session, data: pd.DataFrame) -> int:
    """Upsert processed CSV rows into sales_records, auto-creating warehouses
    and products referenced by `store`/`item`.

    Existing (date, product, warehouse) rows are skipped rather than
    overwritten, so re-uploading the same file is a safe no-op. Returns the
    number of new rows written.

    Runs one query per *distinct* store/item value (not per row, via the
    caches below) plus one batched existence check for the whole upload —
    not the one-existence-query-per-CSV-row a naive per-row implementation
    would do, which turns a 50k-row upload into 50k round trips.
    """
    if data.empty:
        return 0

    warehouse_cache: Dict[int, Warehouse] = {
        store_id: _get_or_create_warehouse(db, store_id) for store_id in data["store"].astype(int).unique()
    }
    product_cache: Dict[int, Product] = {
        item_id: _get_or_create_product(db, item_id) for item_id in data["item"].astype(int).unique()
    }

    record_dates = pd.to_datetime(data[["year", "month", "day"]]).dt.date

    # One batched existence check for the whole upload: every (date,
    # product_id, warehouse_id) already in sales_records whose date falls
    # within this upload's date range (SalesRecord.date is indexed, so this
    # stays cheap even against a large table).
    existing_keys = {
        (row.date, row.product_id, row.warehouse_id)
        for row in db.query(SalesRecord.date, SalesRecord.product_id, SalesRecord.warehouse_id)
        .filter(SalesRecord.date.in_(record_dates.unique()))
        .all()
    }

    written = 0
    for row, record_date in zip(data.itertuples(index=False), record_dates):
        warehouse = warehouse_cache[int(row.store)]
        product = product_cache[int(row.item)]

        key = (record_date, product.id, warehouse.id)
        if key in existing_keys:
            continue

        db.add(
            SalesRecord(
                date=record_date,
                warehouse_id=warehouse.id,
                product_id=product.id,
                sales=float(row.sales),
                source=SalesRecordSource.legacy_import,
            )
        )
        existing_keys.add(key)  # guards against duplicate (date, product, warehouse) rows within this same upload
        written += 1

    db.commit()
    logger.info("Persisted %d new sales_records rows", written)
    return written
