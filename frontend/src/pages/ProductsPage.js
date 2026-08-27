import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import StockAdjustModal from '../components/StockAdjustModal';
import { createProduct, deactivateProduct, listProducts, updateProduct } from '../api/products';
import usePaginatedList from '../hooks/usePaginatedList';
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
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listProducts(false, { skip, limit }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const payload = {
      ...form,
      reorder_point: Number(form.reorder_point),
      unit_price: Number(form.unit_price),
    };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        setEditingId(null);
      } else {
        await createProduct(payload);
      }
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || (editingId ? 'Could not update product.' : 'Could not create product.'));
    }
  };

  const handleEditClick = (row) => {
    setFormError(null);
    setEditingId(row.id);
    setForm({
      sku_code: row.sku_code,
      name: row.name,
      category: row.category || '',
      reorder_point: row.reorder_point,
      unit_price: row.unit_price,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleDeactivate = async (id) => {
    setFormError(null);
    try {
      await deactivateProduct(id);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not deactivate product.');
    }
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
              <button type="button" onClick={() => handleEditClick(row)}>
                Edit
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
          <label htmlFor="sku_code" className="sr-only">SKU code</label>
          <input
            id="sku_code"
            placeholder="SKU code"
            value={form.sku_code}
            onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
            required
          />
          <label htmlFor="name" className="sr-only">Name</label>
          <input
            id="name"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label htmlFor="category" className="sr-only">Category</label>
          <input
            id="category"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <label htmlFor="reorder_point" className="sr-only">Reorder point</label>
          <input
            id="reorder_point"
            placeholder="Reorder point"
            type="number"
            min="0"
            value={form.reorder_point}
            onChange={(e) => setForm({ ...form, reorder_point: e.target.value })}
          />
          <label htmlFor="unit_price" className="sr-only">Unit price</label>
          <input
            id="unit_price"
            placeholder="Unit price"
            type="number"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          />
          <button type="submit">{editingId ? 'Save changes' : 'Add product'}</button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit}>
              Cancel edit
            </button>
          )}
        </form>
      ) : (
        <p className="hint">Log in to add or manage products.</p>
      )}

      {formError && <p className="form-error">{formError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? <p>Loading…</p> : <DataTable columns={columns} rows={items} />}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onAdjusted={() => reload()}
        />
      )}
    </div>
  );
}

export default ProductsPage;
