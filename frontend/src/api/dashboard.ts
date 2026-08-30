import { apiClient } from './client';
import type { DashboardKpis } from './types';

export async function getDashboardKpis(days = 30): Promise<DashboardKpis> {
  const response = await apiClient.get<DashboardKpis>('/dashboard/kpis', { params: { days } });
  return response.data;
}
