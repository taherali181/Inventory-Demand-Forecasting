import { apiClient } from './client';
import type { PaginatedResponse, ProductRead } from './types';

/** One-off, non-paginated read used to populate an id→name lookup — not wired through a "load more" list. */
export async function listProducts(limit = 200): Promise<ProductRead[]> {
  const response = await apiClient.get<PaginatedResponse<ProductRead>>('/products', { params: { limit } });
  return response.data.items;
}
