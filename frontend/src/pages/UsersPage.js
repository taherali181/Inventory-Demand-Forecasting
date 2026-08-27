import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { deactivateUser, listUsers, updateUserRole } from '../api/users';
import usePaginatedList from '../hooks/usePaginatedList';
import { useAuth } from '../context/AuthContext';

const ROLES = ['staff', 'admin'];

function UsersPage() {
  const { user: currentUser } = useAuth();
  const [actionError, setActionError] = useState(null);
  const { items, total, isLoading, error, reload, loadMore, hasMore } = usePaginatedList(
    ({ skip, limit }) => listUsers({ skip, limit }),
    []
  );

  // This page is only linked from the navbar for an admin (see Navbar.js),
  // but it's routable directly too — the backend is the real enforcement
  // (GET /users itself 403s for non-admins), this is just a friendlier
  // message than a raw failed-request error for anyone who lands here
  // without admin access.
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="page">
        <h1>Users</h1>
        <p className="hint">You need admin access to view this page.</p>
      </div>
    );
  }

  const handleRoleChange = async (targetUser, role) => {
    setActionError(null);
    try {
      await updateUserRole(targetUser.id, role);
      reload();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not update role.');
    }
  };

  const handleDeactivate = async (targetUser) => {
    setActionError(null);
    try {
      await deactivateUser(targetUser.id);
      reload();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Could not deactivate user.');
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'full_name', label: 'Name', render: (row) => row.full_name || '—' },
    {
      key: 'role',
      label: 'Role',
      render: (row) =>
        row.id === currentUser.id ? (
          row.role
        ) : (
          <select value={row.role} onChange={(e) => handleRoleChange(row, e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ),
    },
    { key: 'is_active', label: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: '',
      render: (row) =>
        row.id === currentUser.id || !row.is_active ? null : (
          <button type="button" onClick={() => handleDeactivate(row)}>
            Deactivate
          </button>
        ),
    },
  ];

  return (
    <div className="page">
      <h1>Users</h1>
      <p>Admin-only. You can't change your own role or deactivate your own account.</p>

      {actionError && <p className="form-error">{actionError}</p>}
      {error && <p className="form-error">{error}</p>}
      {isLoading && items.length === 0 ? <p>Loading…</p> : <DataTable columns={columns} rows={items} />}
      <LoadMoreButton items={items} total={total} hasMore={hasMore} isLoading={isLoading} onLoadMore={loadMore} />
    </div>
  );
}

export default UsersPage;
