import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { listStockMovements } from '../api/stock';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';
import usePaginatedList from '../hooks/usePaginatedList';

function StockMovementsPage() {
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [lookupError, setLookupError] = useState(null);
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const { items, total, isLoading, error, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) =>
      listStockMovements({
        productId: productFilter ? Number(productFilter) : undefined,
        warehouseId: warehouseFilter ? Number(warehouseFilter) : undefined,
        skip,
        limit,
      }),
    [productFilter, warehouseFilter]
  );

  useEffect(() => {
    // Name lookups only — see StockPage.js for the same pattern/tradeoff.
    Promise.all([listProducts(true, { limit: 200 }), listWarehouses(true, { limit: 200 })])
      .then(([products, warehouses]) => {
        setProductsById(Object.fromEntries(products.items.map((p) => [p.id, p])));
        setWarehousesById(Object.fromEntries(warehouses.items.map((w) => [w.id, w])));
      })
      .catch(() => setLookupError('Could not load product/warehouse names.'));
  }, []);

  const columns = [
    { key: 'product', label: 'Product', render: (row) => productsById[row.product_id]?.name || `#${row.product_id}` },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row) => warehousesById[row.warehouse_id]?.name || `#${row.warehouse_id}`,
    },
    { key: 'movement_type', label: 'Type' },
    { key: 'quantity_delta', label: 'Quantity change' },
    { key: 'reference_type', label: 'Reference' },
    { key: 'created_at', label: 'When', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div className="page">
      <h1>Stock movements</h1>
      <p>A full audit trail of every stock adjustment and purchase-order receipt.</p>

      <div className="inline-form">
        <label htmlFor="movements_product" className="sr-only">Filter by product</label>
        <select
          id="movements_product"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="">All products</option>
          {Object.values(productsById).map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku_code} — {p.name}
            </option>
          ))}
        </select>
        <label htmlFor="movements_warehouse" className="sr-only">Filter by warehouse</label>
        <select
          id="movements_warehouse"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="">All warehouses</option>
          {Object.values(warehousesById).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {lookupError && <p className="form-error">{lookupError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={items} rowKey="id" emptyMessage="No stock movements yet." />
      )}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default StockMovementsPage;
