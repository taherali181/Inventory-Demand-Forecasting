import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import POForm from '../components/POForm';
import { createPurchaseOrder, listPurchaseOrders } from '../api/purchaseOrders';
import { useAuth } from '../context/AuthContext';

function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setIsLoading(true);
    listPurchaseOrders()
      .then(setOrders)
      .catch(() => setError('Could not load purchase orders.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(refresh, []);

  const handleCreate = async (payload) => {
    await createPurchaseOrder(payload);
    refresh();
  };

  const columns = [
    {
      key: 'po_number',
      label: 'PO number',
      render: (row) => <Link to={`/purchase-orders/${row.id}`}>{row.po_number}</Link>,
    },
    { key: 'status', label: 'Status' },
    { key: 'order_date', label: 'Order date' },
    { key: 'items', label: 'Line items', render: (row) => row.items.length },
  ];

  return (
    <div className="page">
      <h1>Purchase orders</h1>

      {user ? <POForm onSubmit={handleCreate} /> : <p className="hint">Log in to create purchase orders.</p>}

      {error && <p className="form-error">{error}</p>}
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={orders} emptyMessage="No purchase orders yet." />
      )}
    </div>
  );
}

export default PurchaseOrdersPage;
