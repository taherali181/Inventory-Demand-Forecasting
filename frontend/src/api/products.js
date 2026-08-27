import client from './client';

export function listProducts(includeInactive = false) {
  return client.get('/products', { params: { include_inactive: includeInactive } }).then((res) => res.data);
}

export function createProduct(payload) {
  return client.post('/products', payload).then((res) => res.data);
}

export function updateProduct(id, payload) {
  return client.put(`/products/${id}`, payload).then((res) => res.data);
}

export function deactivateProduct(id) {
  return client.delete(`/products/${id}`);
}
