import client from './client';

// Returns { items, total } — see components/PaginatedList.js.
export function listAlerts(statusFilter, { skip = 0, limit = 50 } = {}) {
  return client.get('/alerts', { params: { status_filter: statusFilter, skip, limit } }).then((res) => res.data);
}

export function recomputeAlerts() {
  return client.post('/alerts/recompute').then((res) => res.data);
}
