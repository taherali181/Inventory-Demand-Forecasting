import client from './client';

export function listWarehouses(includeInactive = false) {
  return client.get('/warehouses', { params: { include_inactive: includeInactive } }).then((res) => res.data);
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
