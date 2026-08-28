import client, { API_BASE_URL } from './client';

// Returns { items, total } — see components/LoadMoreButton.js.
export function listPurchaseOrders({ skip = 0, limit = 50 } = {}) {
  return client.get('/purchase-orders', { params: { skip, limit } }).then((res) => res.data);
}

export function getPurchaseOrder(id) {
  return client.get(`/purchase-orders/${id}`).then((res) => res.data);
}

export function createPurchaseOrder(payload) {
  return client.post('/purchase-orders', payload).then((res) => res.data);
}

export function updatePurchaseOrderStatus(id, status) {
  return client.put(`/purchase-orders/${id}/status`, { status }).then((res) => res.data);
}

export function submitPurchaseOrder(id) {
  return updatePurchaseOrderStatus(id, 'submitted');
}

export function approvePurchaseOrder(id) {
  return updatePurchaseOrderStatus(id, 'approved');
}

export function cancelPurchaseOrder(id) {
  return updatePurchaseOrderStatus(id, 'cancelled');
}

export function receivePurchaseOrder(id, items) {
  return client.post(`/purchase-orders/${id}/receive`, { items }).then((res) => res.data);
}

// See api/products.js's productsExportUrl for why this is a plain URL, not
// an axios call.
export function purchaseOrdersExportUrl() {
  return `${API_BASE_URL}/purchase-orders/export`;
}
