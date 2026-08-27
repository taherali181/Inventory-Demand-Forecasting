import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPurchaseOrder, receivePurchaseOrder, updatePurchaseOrderStatus } from '../api/purchaseOrders';

const NEXT_STATUSES = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'cancelled'],
  approved: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
};

function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setIsLoading(true);
    getPurchaseOrder(id)
      .then((data) => {
        setPo(data);
        setReceiveQuantities({});
      })
      .catch(() => setError('Could not load this purchase order.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(refresh, [id]);

  const handleTransition = async (status) => {
    setError(null);
    try {
      await updatePurchaseOrderStatus(id, status);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update status.');
    }
  };

  const handleReceive = async (event) => {
    event.preventDefault();
    setError(null);
    const items = Object.entries(receiveQuantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, qty]) => ({ product_id: Number(productId), quantity: Number(qty) }));
    if (items.length === 0) {
      setError('Enter a quantity to receive for at least one line item.');
      return;
    }
    try {
      await receivePurchaseOrder(id, items);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not record receipt.');
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }
  if (!po) {
    return (
      <div className="page">
        <p className="form-error">{error || 'Not found.'}</p>
      </div>
    );
  }

  const nextStatuses = NEXT_STATUSES[po.status] || [];
  const canReceive = po.status === 'approved' || po.status === 'partially_received';

  return (
    <div className="page">
      <h1>{po.po_number}</h1>
      <p>
        Status: <strong>{po.status}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}

      {nextStatuses.length > 0 && (
        <div className="row-actions">
          {nextStatuses.map((status) => (
            <button key={status} type="button" onClick={() => handleTransition(status)}>
              Mark {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Unit cost</th>
              {canReceive && <th>Receive now</th>}
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product_id}</td>
                <td>{item.quantity_ordered}</td>
                <td>{item.quantity_received}</td>
                <td>{item.unit_cost}</td>
                {canReceive && (
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity_ordered - item.quantity_received}
                      value={receiveQuantities[item.product_id] || ''}
                      onChange={(e) =>
                        setReceiveQuantities((prev) => ({ ...prev, [item.product_id]: e.target.value }))
                      }
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canReceive && (
        <form onSubmit={handleReceive}>
          <button type="submit">Record receipt</button>
        </form>
      )}
    </div>
  );
}

export default PurchaseOrderDetailPage;
