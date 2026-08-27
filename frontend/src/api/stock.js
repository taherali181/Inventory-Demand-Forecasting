import client from './client';

// Returns { items, total } — see components/LoadMoreButton.js.
export function listStock({ productId, warehouseId, skip = 0, limit = 50 } = {}) {
  return client
    .get('/stock', { params: { product_id: productId, warehouse_id: warehouseId, skip, limit } })
    .then((res) => res.data);
}

export function adjustStock(payload) {
  return client.post('/stock/adjust', payload).then((res) => res.data);
}

// Returns { items, total } — see components/LoadMoreButton.js.
export function listStockMovements({ productId, warehouseId, startDate, endDate, skip = 0, limit = 50 } = {}) {
  return client
    .get('/stock/movements', {
      params: {
        product_id: productId,
        warehouse_id: warehouseId,
        start_date: startDate,
        end_date: endDate,
        skip,
        limit,
      },
    })
    .then((res) => res.data);
}
