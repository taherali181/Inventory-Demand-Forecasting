import { apiClient } from './client';
import type { PaginatedResponse, SupplierRead } from './types';

/** One-off, non-paginated read used to populate an id→name lookup — not wired through a "load more" list. */
export async function listSuppliers(limit = 200): Promise<SupplierRead[]> {
  const response = await apiClient.get<PaginatedResponse<SupplierRead>>('/suppliers', { params: { limit } });
  return response.data.items;
}
