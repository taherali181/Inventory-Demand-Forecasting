import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { createWarehouse, deactivateWarehouse, listWarehouses } from '../api/warehouses';
import usePaginatedList from '../hooks/usePaginatedList';
import { useAuth } from '../context/AuthContext';

const baseColumns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
];

const emptyForm = { name: '', code: '', city: '', country: '' };

function WarehousesPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listWarehouses(false, { skip, limit }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    try {
      await createWarehouse(form);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not create warehouse.');
    }
  };

  const handleDeactivate = async (id) => {
    await deactivateWarehouse(id);
    reload();
  };

  const columns = user
    ? [
        ...baseColumns,
        {
          key: 'actions',
          label: '',
          render: (row) => (
            <button type="button" onClick={() => handleDeactivate(row.id)}>
              Deactivate
            </button>
          ),
        },
      ]
    : baseColumns;

  return (
    <div className="page">
      <h1>Warehouses</h1>

      {user ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <button type="submit">Add warehouse</button>
        </form>
      ) : (
        <p className="hint">Log in to add or manage warehouses.</p>
      )}

      {formError && <p className="form-error">{formError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? <p>Loading…</p> : <DataTable columns={columns} rows={items} />}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default WarehousesPage;
