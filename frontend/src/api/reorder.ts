import { apiClient } from './client';
import type { ReorderSuggestion } from './types';

/** GET /reorder/suggestions returns a bare array, not a paginated `{items, total}` response. */
export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const response = await apiClient.get<ReorderSuggestion[]>('/reorder/suggestions');
  return response.data;
}
