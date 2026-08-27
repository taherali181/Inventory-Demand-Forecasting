import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { listAlerts, recomputeAlerts } from '../api/alerts';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';
import usePaginatedList from '../hooks/usePaginatedList';
import { useAuth } from '../context/AuthContext';

function AlertsPage() {
  const { user } = useAuth();
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [lookupError, setLookupError] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listAlerts('open', { skip, limit }),
    []
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

  const handleRecompute = async () => {
    try {
      await recomputeAlerts();
      reload();
    } catch (err) {
      setLookupError(err.response?.data?.detail || 'Could not recompute alerts.');
    }
  };

  const columns = [
    { key: 'product', label: 'Product', render: (row) => productsById[row.product_id]?.name || `#${row.product_id}` },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row) => warehousesById[row.warehouse_id]?.name || `#${row.warehouse_id}`,
    },
    { key: 'threshold_value', label: 'Reorder point' },
    { key: 'current_value', label: 'Available' },
    { key: 'created_at', label: 'Opened' },
  ];

  return (
    <div className="page">
      <h1>Low-stock alerts</h1>
      <p>Compares each product&apos;s available stock against its reorder point.</p>

      {user ? (
        <button type="button" onClick={handleRecompute} disabled={isLoading}>
          Recompute alerts
        </button>
      ) : (
        <p className="hint">Log in to recompute alerts.</p>
      )}

      {lookupError && <p className="form-error">{lookupError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={items} emptyMessage="No open alerts." />
      )}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default AlertsPage;
