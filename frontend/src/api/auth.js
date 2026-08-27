import client from './client';

export function register({ email, password, fullName }) {
  return client
    .post('/auth/register', { email, password, full_name: fullName || null })
    .then((res) => res.data);
}

export function login({ email, password }) {
  return client.post('/auth/login', { email, password }).then((res) => res.data);
}

export function getCurrentUser() {
  return client.get('/auth/me').then((res) => res.data);
}
