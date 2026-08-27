import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import POForm from '../components/POForm';
import { createPurchaseOrder, listPurchaseOrders, purchaseOrdersExportUrl } from '../api/purchaseOrders';
import usePaginatedList from '../hooks/usePaginatedList';
import { useAuth } from '../context/AuthContext';

function PurchaseOrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  // Set by ReorderSuggestionsPage's "Create PO" link (Change 11.2) —
  // pre-fills POForm instead of the user re-entering a suggested reorder
  // by hand. Absent on a normal visit to this page.
  const initialItem = location.state?.initialItem;
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listPurchaseOrders({ skip, limit }),
    []
  );

  const handleCreate = async (payload) => {
    await createPurchaseOrder(payload);
    reload();
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
      <a href={purchaseOrdersExportUrl()} className="hint">
        Export CSV
      </a>

      {user ? (
        <POForm onSubmit={handleCreate} initialItem={initialItem} />
      ) : (
        <p className="hint">Log in to create purchase orders.</p>
      )}

      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={items} emptyMessage="No purchase orders yet." />
      )}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default PurchaseOrdersPage;
