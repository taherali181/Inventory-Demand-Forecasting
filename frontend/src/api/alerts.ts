import { apiClient } from './client';
import type { AlertRead, PaginatedResponse } from './types';

export async function listOpenAlerts(limit = 200): Promise<AlertRead[]> {
  const response = await apiClient.get<PaginatedResponse<AlertRead>>('/alerts', {
    params: { status_filter: 'open', limit },
  });
  return response.data.items;
}
