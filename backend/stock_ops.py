# stock_ops.py
"""Shared stock_levels get-or-create + locking logic, used by both
routers/stock.py's adjust_stock and routers/purchase_orders.py's
receive_purchase_order.

Two distinct races on the same (product_id, warehouse_id) pair are handled
here:

1. Read-modify-write on an EXISTING row (two requests both read
   quantity_on_hand=10, both compute +1, both write back 11 — one update is
   silently lost). with_for_update() is the real, portable fix for this —
   but it's a documented no-op under SQLite (no FOR UPDATE support), and
   this is a single-process app whose default/dev/test/Docker-Compose
   database *is* SQLite. Without more, that's not a hypothetical
   Postgres-only concern: a concurrency test
   (test_inventory.py::test_concurrent_stock_adjustments_all_land) firing
   20 concurrent +1s at one row landed only 11 of them before this module's
   stock_level_lock existed. stock_level_lock is an in-process
   threading.Lock keyed by (product_id, warehouse_id) that actually
   serializes this today; with_for_update() remains in get_or_create_
   stock_level too so a real multi-process Postgres deployment (where the
   in-process lock can't coordinate across processes) is still correct.
   Callers must hold stock_level_lock from the initial read through the
   final db.commit() — not just around the increment — since the write
   only actually lands at commit.

2. Two concurrent requests that both find no row and both try to INSERT
   one — a plain unique-constraint race (uq_stock_product_warehouse), not
   something a row lock on a not-yet-existing row can prevent on any
   backend. get_or_create_stock_level catches and retries this: the loser
   rolls back its own insert attempt and re-reads the row the winner just
   committed.
"""
import threading
from collections import defaultdict
from contextlib import contextmanager

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import StockLevel

_registry_guard = threading.Lock()
_stock_level_locks: dict = defaultdict(threading.Lock)


@contextmanager
def stock_level_lock(product_id: int, warehouse_id: int):
    """Serializes access to one (product_id, warehouse_id)'s stock level
    within this process — see module docstring for why this exists
    alongside (not instead of) with_for_update()."""
    with _registry_guard:
        lock = _stock_level_locks[(product_id, warehouse_id)]
    with lock:
        yield


def get_or_create_stock_level(db: Session, product_id: int, warehouse_id: int) -> StockLevel:
    stock_level = (
        db.query(StockLevel)
        .filter(StockLevel.product_id == product_id, StockLevel.warehouse_id == warehouse_id)
        .with_for_update()
        .first()
    )
    if stock_level is not None:
        return stock_level

    stock_level = StockLevel(product_id=product_id, warehouse_id=warehouse_id, quantity_on_hand=0)
    db.add(stock_level)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        stock_level = (
            db.query(StockLevel)
            .filter(StockLevel.product_id == product_id, StockLevel.warehouse_id == warehouse_id)
            .with_for_update()
            .first()
        )
    return stock_level
