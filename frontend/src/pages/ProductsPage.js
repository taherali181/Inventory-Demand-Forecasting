import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import StockAdjustModal from '../components/StockAdjustModal';
import { createProduct, deactivateProduct, listProducts } from '../api/products';
import { useAuth } from '../context/AuthContext';

const baseColumns = [
  { key: 'sku_code', label: 'SKU' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'reorder_point', label: 'Reorder point' },
  { key: 'unit_price', label: 'Unit price' },
];

const emptyForm = { sku_code: '', name: '', category: '', reorder_point: 0, unit_price: 0 };

function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const refresh = () => {
    setIsLoading(true);
    listProducts()
      .then(setProducts)
      .catch(() => setError('Could not load products.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(refresh, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await createProduct({
        ...form,
        reorder_point: Number(form.reorder_point),
        unit_price: Number(form.unit_price),
      });
      setForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create product.');
    }
  };

  const handleDeactivate = async (id) => {
    await deactivateProduct(id);
    refresh();
  };

  const columns = user
    ? [
        ...baseColumns,
        {
          key: 'actions',
          label: '',
          render: (row) => (
            <div className="row-actions">
              <button type="button" onClick={() => setAdjustingProduct(row)}>
                Adjust stock
              </button>
              <button type="button" onClick={() => handleDeactivate(row.id)}>
                Deactivate
              </button>
            </div>
          ),
        },
      ]
    : baseColumns;

  return (
    <div className="page">
      <h1>Products</h1>

      {user ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="SKU code"
            value={form.sku_code}
            onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
            required
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Reorder point"
            type="number"
            min="0"
            value={form.reorder_point}
            onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
          />
          <input
            placeholder="Unit price"
            type="number"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          />
          <button type="submit">Add product</button>
        </form>
      ) : (
        <p className="hint">Log in to add or manage products.</p>
      )}

      {error && <p className="form-error">{error}</p>}
      {isLoading ? <p>Loading…</p> : <DataTable columns={columns} rows={products} />}

      {adjustingProduct && (
        <StockAdjustModal product={adjustingProduct} onClose={() => setAdjustingProduct(null)} onAdjusted={() => {}} />
      )}
    </div>
  );
}

export default ProductsPage;
