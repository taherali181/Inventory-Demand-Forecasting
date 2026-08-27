import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { createWarehouse, deactivateWarehouse, listWarehouses, updateWarehouse } from '../api/warehouses';
import useDebouncedValue from '../hooks/useDebouncedValue';
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
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listWarehouses(false, { skip, limit, search }),
    [search]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    try {
      if (editingId) {
        await updateWarehouse(editingId, form);
        setEditingId(null);
      } else {
        await createWarehouse(form);
      }
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || (editingId ? 'Could not update warehouse.' : 'Could not create warehouse.'));
    }
  };

  const handleEditClick = (row) => {
    setFormError(null);
    setEditingId(row.id);
    setForm({ name: row.name, code: row.code, city: row.city || '', country: row.country || '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleDeactivate = async (id) => {
    setFormError(null);
    try {
      await deactivateWarehouse(id);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not deactivate warehouse.');
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
      <h1>Warehouses</h1>

      {user ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <label htmlFor="wh_name" className="sr-only">Name</label>
          <input
            id="wh_name"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label htmlFor="wh_code" className="sr-only">Code</label>
          <input
            id="wh_code"
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <label htmlFor="wh_city" className="sr-only">City</label>
          <input
            id="wh_city"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <label htmlFor="wh_country" className="sr-only">Country</label>
          <input
            id="wh_country"
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <button type="submit">{editingId ? 'Save changes' : 'Add warehouse'}</button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit}>
              Cancel edit
            </button>
          )}
        </form>
      ) : (
        <p className="hint">Log in to add or manage warehouses.</p>
      )}

      <div className="inline-form">
        <label htmlFor="warehouse_search" className="sr-only">Search warehouses</label>
        <input
          id="warehouse_search"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {formError && <p className="form-error">{formError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={items} emptyMessage={search ? 'No matching warehouses.' : 'No records yet.'} />
      )}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default WarehousesPage;
