import React, { useEffect, useRef, useState } from 'react';
import { adjustStock } from '../api/stock';
import { listWarehouses } from '../api/warehouses';

function StockAdjustModal({ product, onClose, onAdjusted }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    listWarehouses(false, { limit: 200 }).then((data) => {
      setWarehouses(data.items);
      if (data.items.length > 0) setWarehouseId(String(data.items[0].id));
    });
  }, []);

  // Focus the first focusable element on mount, close on Escape, and trap
  // Tab/Shift+Tab within the modal's small, fixed set of focusable
  // elements (select, input, 2 buttons) — a manual trap is reasonable at
  // this size; no need for a focus-trap dependency.
  useEffect(() => {
    const focusable = () =>
      Array.from(modalRef.current?.querySelectorAll('select, input, button') || []);

    focusable()[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjust-modal-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="stock-adjust-modal-title">Adjust stock — {product.name}</h2>
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
