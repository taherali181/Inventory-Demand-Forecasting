import React, { useEffect, useState } from 'react';
import { adjustStock } from '../api/stock';
import { listWarehouses } from '../api/warehouses';

function StockAdjustModal({ product, onClose, onAdjusted }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listWarehouses(false, { limit: 200 }).then((data) => {
      setWarehouses(data.items);
      if (data.items.length > 0) setWarehouseId(String(data.items[0].id));
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await adjustStock({
        product_id: product.id,
        warehouse_id: Number(warehouseId),
        quantity_delta: Number(quantityDelta),
      });
      onAdjusted(result);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Adjust stock — {product.name}</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="warehouse">Warehouse</label>
          <select id="warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <label htmlFor="delta">Quantity change (negative to remove stock)</label>
          <input
            id="delta"
            type="number"
            value={quantityDelta}
            onChange={(e) => setQuantityDelta(e.target.value)}
            required
          />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !warehouseId}>
              {isSubmitting ? 'Saving…' : 'Apply'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default StockAdjustModal;
