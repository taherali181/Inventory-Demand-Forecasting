import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { createSupplier, deactivateSupplier, listSuppliers, updateSupplier } from '../api/suppliers';
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
  const [editingId, setEditingId] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listSuppliers(false, { skip, limit }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const payload = { ...form, lead_time_days: Number(form.lead_time_days) };
    try {
      if (editingId) {
        await updateSupplier(editingId, payload);
        setEditingId(null);
      } else {
        await createSupplier(payload);
      }
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || (editingId ? 'Could not update supplier.' : 'Could not create supplier.'));
    }
  };

  const handleEditClick = (row) => {
    setFormError(null);
    setEditingId(row.id);
    setForm({
      name: row.name,
      contact_name: row.contact_name || '',
      email: row.email || '',
      lead_time_days: row.lead_time_days,
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
      await deactivateSupplier(id);
      reload();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not deactivate supplier.');
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
      <h1>Suppliers</h1>

      {user ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <label htmlFor="sup_name" className="sr-only">Name</label>
          <input
            id="sup_name"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label htmlFor="sup_contact_name" className="sr-only">Contact name</label>
          <input
            id="sup_contact_name"
            placeholder="Contact name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <label htmlFor="sup_email" className="sr-only">Email</label>
          <input
            id="sup_email"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <label htmlFor="sup_lead_time_days" className="sr-only">Lead time (days)</label>
          <input
            id="sup_lead_time_days"
            placeholder="Lead time (days)"
            type="number"
            min="0"
            value={form.lead_time_days}
            onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
          />
          <button type="submit">{editingId ? 'Save changes' : 'Add supplier'}</button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit}>
              Cancel edit
            </button>
          )}
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
