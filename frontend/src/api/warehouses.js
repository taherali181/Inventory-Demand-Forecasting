import client from './client';

// Returns { items, total } — see components/PaginatedList.js for the
// "Load more" pattern shared by every paginated list page.
export function listWarehouses(includeInactive = false, { skip = 0, limit = 50 } = {}) {
  return client
    .get('/warehouses', { params: { include_inactive: includeInactive, skip, limit } })
    .then((res) => res.data);
}

export function createWarehouse(payload) {
  return client.post('/warehouses', payload).then((res) => res.data);
}

export function updateWarehouse(id, payload) {
  return client.put(`/warehouses/${id}`, payload).then((res) => res.data);
}

export function deactivateWarehouse(id) {
  return client.delete(`/warehouses/${id}`);
}
