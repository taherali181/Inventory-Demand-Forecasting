import React, { useEffect, useState } from 'react';
import { listProducts } from '../api/products';
import { listSuppliers } from '../api/suppliers';
import { listWarehouses } from '../api/warehouses';

const emptyLine = { product_id: '', quantity_ordered: 1, unit_cost: 0 };

function POForm({ onSubmit }) {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listSuppliers().then((data) => {
      setSuppliers(data);
      if (data.length > 0) setSupplierId(String(data[0].id));
    });
    listWarehouses().then((data) => {
      setWarehouses(data);
      if (data.length > 0) setWarehouseId(String(data[0].id));
    });
    listProducts().then((data) => {
      setProducts(data);
      setItems([{ ...emptyLine, product_id: data.length > 0 ? String(data[0].id) : '' }]);
    });
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
