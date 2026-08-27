import client from './client';

export function getForecast(forecastHorizon = 7) {
  return client
    .get('/forecast', { params: { forecast_horizon: forecastHorizon } })
    .then((res) => res.data);
}
