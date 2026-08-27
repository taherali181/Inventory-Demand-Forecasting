import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { createSupplier, deactivateSupplier, listSuppliers } from '../api/suppliers';
import usePaginatedList from '../hooks/usePaginatedList';
import { useAuth } from '../context/AuthContext';

const baseColumns = [
  { key: 'name', label: 'Name' },
  { key: 'contact_name', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'lead_time_days', label: 'Lead time (days)' },
];

const emptyForm = { name: '', contact_name: '', email: '', lead_time_days: 7 };

function SuppliersPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listSuppliers(false, { skip, limit }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    try {
      await createSupplier({ ...form, lead_time_days: Number(form.lead_time_days) });
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not create supplier.');
    }
  };

  const handleDeactivate = async (id) => {
    await deactivateSupplier(id);
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
      <h1>Suppliers</h1>

      {user ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Contact name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Lead time (days)"
            type="number"
            min="0"
            value={form.lead_time_days}
            onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
          />
          <button type="submit">Add supplier</button>
        </form>
      ) : (
        <p className="hint">Log in to add or manage suppliers.</p>
      )}

      {formError && <p className="form-error">{formError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? <p>Loading…</p> : <DataTable columns={columns} rows={items} />}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default SuppliersPage;
