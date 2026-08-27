import client from './client';

// Returns { items, total } — see components/LoadMoreButton.js.
export function listUsers({ skip = 0, limit = 50 } = {}) {
  return client.get('/users', { params: { skip, limit } }).then((res) => res.data);
}

export function updateUserRole(id, role) {
  return client.patch(`/users/${id}/role`, { role }).then((res) => res.data);
}

export function deactivateUser(id) {
  return client.patch(`/users/${id}/deactivate`).then((res) => res.data);
}
