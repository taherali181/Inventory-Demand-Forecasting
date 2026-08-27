import client from './client';

// Returns { items, total } — see components/PaginatedList.js.
export function listProducts(includeInactive = false, { skip = 0, limit = 50 } = {}) {
  return client
    .get('/products', { params: { include_inactive: includeInactive, skip, limit } })
    .then((res) => res.data);
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
