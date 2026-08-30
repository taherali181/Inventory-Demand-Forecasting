import { useEffect, useState } from 'react';
import { listOpenAlerts } from '../api/alerts';
import { getReorderSuggestions } from '../api/reorder';
import { compareForecastRuns } from '../api/forecast';
import { getProductsMap, getSuppliersMap, getWarehousesMap } from '../api/lookups';
import { modelTypeLabel, predictionsToPoints, sharedPredictedSalesRange } from '../lib/forecastPoints';
import type { AlertRowProps } from '../components/canvas/widgets';
import type { AlertRead, ProductRead, ReorderSuggestion, WarehouseRead } from '../api/types';

export interface ReorderCardData {
  title: string;
  meta: string;
  ctaLabel: string;
}

export interface ForecastCardData {
  series1Points: string;
  series2Points?: string;
  series1Label: string;
  series2Label?: string;
}

export interface CanvasWidgetsData {
  loading: boolean;
  error: string | null;
  alerts: AlertRowProps[];
  reorder: ReorderCardData | null;
  forecast: ForecastCardData | null;
  forecastLabel: string;
}

const DEFAULT_FORECAST_LABEL = 'Forecast';

function alertSeverity(alert: AlertRead): 'bad' | 'warn' {
  // No severity field on AlertRead itself — the mockup's own bad/warn split reads as "how far below the
  // threshold is this", so a stock level at or below half its threshold reads as critical (bad), otherwise
  // a plain warning. A heuristic, not a value the backend returns directly.
  return alert.current_value <= alert.threshold_value * 0.5 ? 'bad' : 'warn';
}

function alertRow(alert: AlertRead, products: Map<number, ProductRead>, warehouses: Map<number, WarehouseRead>): AlertRowProps {
  const product = products.get(alert.product_id);
  const warehouse = warehouses.get(alert.warehouse_id);
  const title = product ? `${product.name} — ${product.sku_code}` : `Product #${alert.product_id}`;
  const stockValue = Number.isInteger(alert.current_value)
    ? alert.current_value
    : alert.current_value.toFixed(1);
  const warehouseName = warehouse ? warehouse.name : `Warehouse #${alert.warehouse_id}`;
  return {
    severity: alertSeverity(alert),
    title,
    meta: `${stockValue} units left · reorder pt ${alert.threshold_value} · ${warehouseName}`,
  };
}

function pickTopReorderSuggestion(suggestions: ReorderSuggestion[]): ReorderSuggestion | null {
  if (suggestions.length === 0) return null;
  return [...suggestions].sort((a, b) => b.suggested_order_quantity - a.suggested_order_quantity)[0];
}

/**
 * Resolves a (product_id, warehouse_id) pair to run the forecast section against. There's no single
 * "the current product" concept in this scripted app, so — in priority order — this reuses whichever real
 * pair is already known to be relevant: the top reorder suggestion's pair, else the first open alert's
 * pair, else simply the first product + first warehouse on record. Returns null only when there's truly no
 * product or warehouse in the database yet.
 */
function resolveForecastTarget(
  reorderSuggestions: ReorderSuggestion[],
  alerts: AlertRead[],
  products: Map<number, ProductRead>,
  warehouses: Map<number, WarehouseRead>
): { productId: number; warehouseId: number } | null {
  const topReorder = pickTopReorderSuggestion(reorderSuggestions);
  if (topReorder) return { productId: topReorder.product_id, warehouseId: topReorder.warehouse_id };

  if (alerts.length > 0) {
    return { productId: alerts[0].product_id, warehouseId: alerts[0].warehouse_id };
  }

  const firstProduct = products.values().next().value as ProductRead | undefined;
  const firstWarehouse = warehouses.values().next().value as WarehouseRead | undefined;
  if (firstProduct && firstWarehouse) {
    return { productId: firstProduct.id, warehouseId: firstWarehouse.id };
  }

  return null;
}

/**
 * Fetches and shapes everything CanvasWidgetsPanel's three sections (alerts/reorder/forecast) need from
 * the real backend. Loaded once per mount of the panel — refreshed each time the panel is opened, since
 * the canvas is unmounted when the user navigates away from it (see DesktopShell/MobileShell).
 */
export function useCanvasWidgetsData(): CanvasWidgetsData {
  const [state, setState] = useState<CanvasWidgetsData>({
    loading: true,
    error: null,
    alerts: [],
    reorder: null,
    forecast: null,
    forecastLabel: DEFAULT_FORECAST_LABEL,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [products, warehouses, suppliers, openAlerts, reorderSuggestions] = await Promise.all([
          getProductsMap(),
          getWarehousesMap(),
          getSuppliersMap(),
          listOpenAlerts(),
          getReorderSuggestions(),
        ]);

        const alertRows = openAlerts.map((alert) => alertRow(alert, products, warehouses));

        const topSuggestion = pickTopReorderSuggestion(reorderSuggestions);
        let reorder: ReorderCardData | null = null;
        if (topSuggestion) {
          const product = products.get(topSuggestion.product_id);
          const supplier = product?.default_supplier_id ? suppliers.get(product.default_supplier_id) : undefined;
          const productName = product ? product.name : `Product #${topSuggestion.product_id}`;
          const title = supplier ? `${productName} → ${supplier.name}` : productName;
          const meta = supplier
            ? `Suggested qty: ${topSuggestion.suggested_order_quantity} units · lead time ${supplier.lead_time_days} days`
            : `Suggested qty: ${topSuggestion.suggested_order_quantity} units`;
          reorder = { title, meta, ctaLabel: 'Create PO' };
        }

        const target = resolveForecastTarget(reorderSuggestions, openAlerts, products, warehouses);
        let forecast: ForecastCardData | null = null;
        let forecastLabel = DEFAULT_FORECAST_LABEL;

        if (target) {
          const product = products.get(target.productId);
          const runs = await compareForecastRuns(target.productId, target.warehouseId);
          const productLabel = product ? product.sku_code : `product #${target.productId}`;

          if (runs.length > 0) {
            const [run1, run2] = runs;
            const range = sharedPredictedSalesRange(runs.slice(0, 2).map((r) => r.predictions));
            forecast = {
              series1Points: predictionsToPoints(run1.predictions, range.min, range.max),
              series1Label: modelTypeLabel(run1.model_type),
              ...(run2
                ? {
                    series2Points: predictionsToPoints(run2.predictions, range.min, range.max),
                    series2Label: modelTypeLabel(run2.model_type),
                  }
                : {}),
            };
            forecastLabel = `Forecast — ${productLabel}, next ${run1.forecast_horizon} days`;
          } else {
            forecastLabel = `Forecast — ${productLabel}`;
          }
        }

        if (!cancelled) {
          setState({ loading: false, error: null, alerts: alertRows, reorder, forecast, forecastLabel });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load canvas data.',
          }));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
