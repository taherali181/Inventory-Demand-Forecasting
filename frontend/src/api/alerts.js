import client from './client';

export function listAlerts(statusFilter) {
  return client.get('/alerts', { params: { status_filter: statusFilter } }).then((res) => res.data);
}

export function recomputeAlerts() {
  return client.post('/alerts/recompute').then((res) => res.data);
}
