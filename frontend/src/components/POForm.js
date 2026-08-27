import React, { useEffect, useState } from 'react';
import { listProducts } from '../api/products';
import { listSuppliers } from '../api/suppliers';
import { listWarehouses } from '../api/warehouses';

const emptyLine = { product_id: '', quantity_ordered: 1, unit_cost: 0 };

/** `initialItem` (optional): `{ productId, warehouseId, quantityOrdered }`
 * — pre-fills the form's warehouse and first line item, used by
 * ReorderSuggestionsPage's "Create PO" action (Change 11.2) so a suggested
 * reorder doesn't have to be re-entered by hand. Applied once, when the
 * dropdown data finishes loading — a later prop change doesn't re-apply it,
 * since by then the user may have already started editing the form. */
function POForm({ onSubmit, initialItem }) {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listSuppliers(false, { limit: 200 }).then((data) => {
      setSuppliers(data.items);
      if (data.items.length > 0) setSupplierId(String(data.items[0].id));
    });
    listWarehouses(false, { limit: 200 }).then((data) => {
      setWarehouses(data.items);
      const preferred = initialItem?.warehouseId != null ? String(initialItem.warehouseId) : null;
      if (preferred && data.items.some((w) => String(w.id) === preferred)) {
        setWarehouseId(preferred);
      } else if (data.items.length > 0) {
        setWarehouseId(String(data.items[0].id));
      }
    });
    listProducts(false, { limit: 200 }).then((data) => {
      setProducts(data.items);
      const preferredProduct = initialItem?.productId != null ? String(initialItem.productId) : null;
      const productId =
        preferredProduct && data.items.some((p) => String(p.id) === preferredProduct)
          ? preferredProduct
          : data.items.length > 0
          ? String(data.items[0].id)
          : '';
      setItems([
        {
          ...emptyLine,
          product_id: productId,
          quantity_ordered: initialItem?.quantityOrdered ?? emptyLine.quantity_ordered,
        },
      ]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addLine = () =>
    setItems((prev) => [...prev, { ...emptyLine, product_id: products[0] ? String(products[0].id) : '' }]);
  const removeLine = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity_ordered: Number(item.quantity_ordered),
          unit_cost: Number(item.unit_cost),
        })),
      });
      setItems([{ ...emptyLine, product_id: products[0] ? String(products[0].id) : '' }]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="po-form" onSubmit={handleSubmit}>
      <div className="inline-form">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {items.map((item, index) => (
        <div className="po-line" key={index}>
          <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku_code} — {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Qty"
            value={item.quantity_ordered}
            onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit cost"
            value={item.unit_cost}
            onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
          />
          {items.length > 1 && (
            <button type="button" onClick={() => removeLine(index)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <div className="po-form-actions">
        <button type="button" onClick={addLine}>
          Add line item
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create purchase order'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export default POForm;
