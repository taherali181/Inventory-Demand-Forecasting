import client from './client';

export function getDashboardKpis(days = 30) {
  return client.get('/dashboard/kpis', { params: { days } }).then((res) => res.data);
}
