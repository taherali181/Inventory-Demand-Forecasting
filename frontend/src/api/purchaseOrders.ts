import { apiClient } from './client';
import type { PaginatedResponse, PurchaseOrderRead } from './types';

/** Pages over enough purchase orders to populate the Kanban board (design brief: limit=200). */
export async function listPurchaseOrders(limit = 200): Promise<PurchaseOrderRead[]> {
  const response = await apiClient.get<PaginatedResponse<PurchaseOrderRead>>('/purchase-orders', {
    params: { limit },
  });
  return response.data.items;
}
