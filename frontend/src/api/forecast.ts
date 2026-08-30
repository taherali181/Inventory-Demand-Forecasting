import { apiClient } from './client';
import type { ForecastRunRead } from './types';

/**
 * Each model type's most recent *completed* run for this pair — omits any model type never trained for it
 * (not padded with a placeholder). May return an empty array on a fresh DB; callers must render that
 * honestly (no forecast data yet), not fabricate a chart.
 */
export async function compareForecastRuns(productId: number, warehouseId: number): Promise<ForecastRunRead[]> {
  const response = await apiClient.get<ForecastRunRead[]>('/forecast/compare', {
    params: { product_id: productId, warehouse_id: warehouseId },
  });
  return response.data;
}
