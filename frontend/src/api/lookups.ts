import { listProducts } from './products';
import { listWarehouses } from './warehouses';
import { listSuppliers } from './suppliers';
import type { ProductRead, SupplierRead, WarehouseRead } from './types';

/**
 * `AlertRead`/`ReorderSuggestion`/`PurchaseOrderRead` only carry `product_id`/`warehouse_id`/`supplier_id`,
 * not names (see root CLAUDE.md). Rather than re-fetching products/warehouses/suppliers on every widget
 * render, each is fetched once per page load (`?limit=200`, matching the rest of this app's dropdown-data
 * pattern) and cached here as an id→entity `Map`. Cleared on logout so a different account's data can't
 * leak into a later session's lookups.
 */

let productsPromise: Promise<Map<number, ProductRead>> | null = null;
let warehousesPromise: Promise<Map<number, WarehouseRead>> | null = null;
let suppliersPromise: Promise<Map<number, SupplierRead>> | null = null;

export function getProductsMap(): Promise<Map<number, ProductRead>> {
  if (!productsPromise) {
    productsPromise = listProducts(200).then((products) => new Map(products.map((p) => [p.id, p])));
  }
  return productsPromise;
}

export function getWarehousesMap(): Promise<Map<number, WarehouseRead>> {
  if (!warehousesPromise) {
    warehousesPromise = listWarehouses(200).then((warehouses) => new Map(warehouses.map((w) => [w.id, w])));
  }
  return warehousesPromise;
}

export function getSuppliersMap(): Promise<Map<number, SupplierRead>> {
  if (!suppliersPromise) {
    suppliersPromise = listSuppliers(200).then((suppliers) => new Map(suppliers.map((s) => [s.id, s])));
  }
  return suppliersPromise;
}

export function clearLookupCaches(): void {
  productsPromise = null;
  warehousesPromise = null;
  suppliersPromise = null;
}
