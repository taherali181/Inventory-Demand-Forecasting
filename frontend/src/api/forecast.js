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
