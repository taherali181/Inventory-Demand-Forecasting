import client from './client';

export function uploadCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data);
}

// Returns { items, total } — see components/LoadMoreButton.js.
export function listUploadHistory({ skip = 0, limit = 50 } = {}) {
  return client.get('/upload/history', { params: { skip, limit } }).then((res) => res.data);
}
