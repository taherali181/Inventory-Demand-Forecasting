import client from './client';

export function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data);
}
