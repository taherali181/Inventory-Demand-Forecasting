import client from './client';

export function listPurchaseOrders() {
  return client.get('/purchase-orders').then((res) => res.data);
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

export function receivePurchaseOrder(id, items) {
  return client.post(`/purchase-orders/${id}/receive`, { items }).then((res) => res.data);
}
