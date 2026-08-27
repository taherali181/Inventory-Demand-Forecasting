import client from './client';

// Returns { items, total } — see components/LoadMoreButton.js.
export function listSuppliers(includeInactive = false, { skip = 0, limit = 50, search } = {}) {
  return client
    .get('/suppliers', { params: { include_inactive: includeInactive, skip, limit, search: search || undefined } })
    .then((res) => res.data);
}

export function createSupplier(payload) {
  return client.post('/suppliers', payload).then((res) => res.data);
}

export function updateSupplier(id, payload) {
  return client.put(`/suppliers/${id}`, payload).then((res) => res.data);
}

export function deactivateSupplier(id) {
  return client.delete(`/suppliers/${id}`);
}
