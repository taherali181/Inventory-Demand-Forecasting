import client from './client';

export function getEda(uploadId) {
  return client.get('/eda', { params: uploadId ? { upload_id: uploadId } : {} }).then((res) => res.data);
}
