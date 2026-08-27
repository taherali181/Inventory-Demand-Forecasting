import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { listStock } from '../api/stock';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';
import usePaginatedList from '../hooks/usePaginatedList';

function StockPage() {
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [lookupError, setLookupError] = useState(null);
  const { items, total, isLoading, error, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listStock({ skip, limit }),
    []
  );

  useEffect(() => {
    // Used only to resolve product/warehouse names for display — fetched
    // at the max page size (200) rather than wired through the same
    // "Load more" pattern as the stock list itself, since these are name
    // lookups, not the page's primary paginated content. Catalogs bigger
    // than 200 products/warehouses will fall back to showing "#<id>" for
    // the overflow — a reasonable tradeoff at this app's scale.
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
    { key: 'quantity_on_hand', label: 'On hand' },
    { key: 'quantity_reserved', label: 'Reserved' },
    { key: 'quantity_available', label: 'Available' },
  ];

  return (
    <div className="page">
      <h1>Stock levels</h1>
      <p>Adjust stock from the Products page (each product has an “Adjust stock” action once logged in).</p>
      {lookupError && <p className="form-error">{lookupError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? <p>Loading…</p> : <DataTable columns={columns} rows={items} rowKey="id" />}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default StockPage;
