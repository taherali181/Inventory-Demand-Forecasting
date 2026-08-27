import client, { API_BASE_URL } from './client';

// Returns { items, total } — see components/LoadMoreButton.js.
export function listProducts(includeInactive = false, { skip = 0, limit = 50, search } = {}) {
  return client
    .get('/products', { params: { include_inactive: includeInactive, skip, limit, search: search || undefined } })
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

// GET /products/export is an unauthenticated read (same as every other
// list endpoint), so a plain link works — no need to fetch the CSV via
// axios just to attach an auth header that isn't required.
export function productsExportUrl() {
  return `${API_BASE_URL}/products/export`;
}
