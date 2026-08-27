import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { listAlerts, recomputeAlerts } from '../api/alerts';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';
import { useAuth } from '../context/AuthContext';

function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setIsLoading(true);
    Promise.all([listAlerts('open'), listProducts(true), listWarehouses(true)])
      .then(([alertsData, products, warehouses]) => {
        setAlerts(alertsData);
        setProductsById(Object.fromEntries(products.map((p) => [p.id, p])));
        setWarehousesById(Object.fromEntries(warehouses.map((w) => [w.id, w])));
      })
      .catch(() => setError('Could not load alerts.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(refresh, []);

  const handleRecompute = async () => {
    setError(null);
    try {
      await recomputeAlerts();
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not recompute alerts.');
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

      {error && <p className="form-error">{error}</p>}
      {isLoading ? <p>Loading…</p> : <DataTable columns={columns} rows={alerts} emptyMessage="No open alerts." />}
    </div>
  );
}

export default AlertsPage;
