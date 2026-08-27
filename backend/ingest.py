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
    """
    warehouse_cache: Dict[int, Warehouse] = {}
    product_cache: Dict[int, Product] = {}
    written = 0

    for row in data.itertuples(index=False):
        store_id, item_id = int(row.store), int(row.item)

        warehouse = warehouse_cache.get(store_id)
        if warehouse is None:
            warehouse = _get_or_create_warehouse(db, store_id)
            warehouse_cache[store_id] = warehouse

        product = product_cache.get(item_id)
        if product is None:
            product = _get_or_create_product(db, item_id)
            product_cache[item_id] = product

        record_date = pd.Timestamp(year=int(row.year), month=int(row.month), day=int(row.day)).date()

        exists = (
            db.query(SalesRecord.id)
            .filter(
                SalesRecord.date == record_date,
                SalesRecord.product_id == product.id,
                SalesRecord.warehouse_id == warehouse.id,
            )
            .first()
        )
        if exists:
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
        written += 1

    db.commit()
    logger.info("Persisted %d new sales_records rows", written)
    return written
