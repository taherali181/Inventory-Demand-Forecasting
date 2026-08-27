import client from './client';

export function createForecast({ productId, warehouseId, modelType = 'random_forest', forecastHorizon = 7 }) {
  return client
    .post('/forecast', {
      product_id: productId,
      warehouse_id: warehouseId,
      model_type: modelType,
      forecast_horizon: forecastHorizon,
    })
    .then((res) => res.data);
}

export function getForecastRun(runId) {
  return client.get(`/forecast/${runId}`).then((res) => res.data);
}

// Returns { items, total } — see components/LoadMoreButton.js.
export function listForecastRuns({ productId, warehouseId, skip = 0, limit = 50 } = {}) {
  return client
    .get('/forecast', { params: { product_id: productId, warehouse_id: warehouseId, skip, limit } })
    .then((res) => res.data);
}

// Returns a plain array (not paginated) — at most one run per model type.
export function compareForecastRuns({ productId, warehouseId }) {
  return client
    .get('/forecast/compare', { params: { product_id: productId, warehouse_id: warehouseId } })
    .then((res) => res.data);
}
