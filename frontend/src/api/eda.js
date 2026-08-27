import client from './client';

export function getEda() {
  return client.get('/eda').then((res) => res.data);
}
