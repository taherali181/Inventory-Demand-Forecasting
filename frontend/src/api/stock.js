import client from './client';

export function listStock({ productId, warehouseId } = {}) {
  return client
    .get('/stock', { params: { product_id: productId, warehouse_id: warehouseId } })
    .then((res) => res.data);
}

export function adjustStock(payload) {
  return client.post('/stock/adjust', payload).then((res) => res.data);
}
