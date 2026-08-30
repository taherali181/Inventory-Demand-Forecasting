import { apiClient, clearTokens, getRefreshToken, setTokens } from './client';
import type { Token, UserRead } from './types';

/**
 * No `register` here: the Login screen's only "create account" affordance is a plain, non-functional
 * `<a href="#">Create one</a>` link (see `LoginScreen.tsx`) — there is no built register screen in the
 * mockups to wire it to, per this package's instructions ("if there's no register UI in the built screens,
 * skip it, don't invent one").
 */

export async function login(email: string, password: string): Promise<UserRead> {
  const response = await apiClient.post<Token>('/auth/login', { email, password });
  setTokens(response.data.access_token, response.data.refresh_token);
  return getCurrentUser();
}

export async function getCurrentUser(): Promise<UserRead> {
  const response = await apiClient.get<UserRead>('/auth/me');
  return response.data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    }
  } finally {
    clearTokens();
  }
}
