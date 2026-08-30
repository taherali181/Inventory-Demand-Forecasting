import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Shared axios instance — base URL from `VITE_API_BASE_URL` (Vite only reads `VITE_`-prefixed env vars,
 * and only at build/start time; see `.env.example`), falling back to the backend's own default dev address
 * if unset. Mirrors the old CRA app's `src/api/client.js` (see root CLAUDE.md's Frontend section) for the
 * *behavior* to reproduce — none of that file's code, which is gone along with the rest of the old frontend.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Registered by ShellContext/App at startup (module-level callback, not a direct import, to avoid a
 * circular import between this module and the shell state — same reasoning as the old app's
 * `setSessionExpiredHandler`). Called when a refresh-and-retry attempt itself fails, so the app can drop
 * back to the logged-out state.
 */
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(url && url.startsWith('/auth/'));
}

// Exactly one silent refresh-and-retry per request on a 401 — tracked via a flag on the request config
// itself so a request that fails again after retrying doesn't loop.
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available.');
  }
  // De-duplicate concurrent 401s into a single /auth/refresh call.
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ access_token: string; token_type: string }>(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((response) => {
        setAccessToken(response.data.access_token);
        return response.data.access_token;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      isAuthEndpoint(config.url)
    ) {
      throw error;
    }

    config._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      config.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return apiClient.request(config);
    } catch (refreshError) {
      clearTokens();
      sessionExpiredHandler?.();
      throw refreshError;
    }
  }
);
