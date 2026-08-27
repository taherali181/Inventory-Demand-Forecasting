import client from './client';

export function listSuppliers(includeInactive = false) {
  return client.get('/suppliers', { params: { include_inactive: includeInactive } }).then((res) => res.data);
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
