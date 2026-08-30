import { apiClient } from './client';
import type { PaginatedResponse, WarehouseRead } from './types';

/** One-off, non-paginated read used to populate an id→name lookup — not wired through a "load more" list. */
export async function listWarehouses(limit = 200): Promise<WarehouseRead[]> {
  const response = await apiClient.get<PaginatedResponse<WarehouseRead>>('/warehouses', { params: { limit } });
  return response.data.items;
}
