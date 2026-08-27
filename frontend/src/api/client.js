import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const client = axios.create({ baseURL: API_BASE_URL });

// Attach the stored JWT (if any) to every request. Endpoints that don't
// require auth (upload/forecast/eda) just ignore it; /auth/me requires it.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Set by AuthContext on mount; called when a session can't be recovered
// (no refresh token, or the refresh itself failed) so the app can clear its
// user state. A plain module-level callback rather than importing
// AuthContext here avoids a circular import between this client and the
// context that consumes it.
let onSessionExpired = () => {};
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

let refreshPromise = null;

function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token stored.'));
  }

  // Dedupe concurrent 401s hitting this at once — without this, N
  // simultaneously-failing requests would each kick off their own
  // /auth/refresh instead of sharing one in-flight attempt.
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
      .then((res) => {
        localStorage.setItem('accessToken', res.data.access_token);
        return res.data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// On a 401, attempt exactly one silent refresh-and-retry of the original
// request. If that also fails (refresh token missing/expired/revoked),
// clear stored auth and notify AuthContext instead of leaving the caller to
// silently swallow the failure — see the per-page try/catches this replaces
// the need for on the "session expired mid-use" path specifically.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newAccessToken}` };
        return client(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
