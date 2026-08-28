import * as dashboardApi from '../api/dashboard';
import * as alertsApi from '../api/alerts';
import * as reorderApi from '../api/reorder';
import * as forecastApi from '../api/forecast';
import * as stockApi from '../api/stock';
import * as poApi from '../api/purchaseOrders';
import * as productsApi from '../api/products';
import * as warehousesApi from '../api/warehouses';
import * as suppliersApi from '../api/suppliers';
import * as edaApi from '../api/eda';

export const toolRegistry = {
  // 1. Dashboard & KPIs
  get_kpis: {
    name: 'get_kpis',
    description: 'Fetch inventory KPIs: turnover, stockout rate, and forecast accuracy.',
    execute: async (params = {}) => {
      const days = params.period_days || 30;
      const data = await dashboardApi.getDashboardKpis(days);
      return {
        success: true,
        data,
        widget: {
          type: 'kpi-summary',
          data: { ...data, periodDays: days }
        }
      };
    }
  },

  // 2. Alerts
  get_alerts: {
    name: 'get_alerts',
    description: 'List active low stock alerts and inventory warnings.',
    execute: async (params = {}) => {
      const status = params.status || 'open';
      const data = await alertsApi.listAlerts(status, { limit: params.limit || 10 });
      const items = data.items || data || [];
      return {
        success: true,
        data: items,
        widget: {
          type: 'alerts-radar',
          data: items
        }
      };
    }
  },

  recompute_alerts: {
    name: 'recompute_alerts',
    description: 'Trigger immediate recalculation of stock levels against reorder thresholds.',
    execute: async () => {
      const data = await alertsApi.recomputeAlerts();
      return {
        success: true,
        data,
        message: `Alerts recalculated. ${data?.length || 0} open low-stock alert(s).`
      };
    }
  },

  // 3. Reorder Suggestions
  get_reorder_suggestions: {
    name: 'get_reorder_suggestions',
    description: 'Get reorder suggestions computed from current stock and the latest forecast.',
    execute: async () => {
      const data = await reorderApi.listReorderSuggestions();
      const items = Array.isArray(data) ? data : (data.items || []);
      return {
        success: true,
        data: items,
        widget: {
          type: 'reorder-action',
          data: items
        }
      };
    }
  },

  // 4. Forecasting
  run_forecast: {
    name: 'run_forecast',
    description: 'Schedule a demand forecast run for a product and warehouse.',
    execute: async (params = {}) => {
      const { product_id, warehouse_id, model_type = 'random_forest', horizon_days = 30 } = params;
      const data = await forecastApi.createForecast({
        productId: parseInt(product_id),
        warehouseId: parseInt(warehouse_id),
        modelType: model_type,
        forecastHorizon: parseInt(horizon_days)
      });
      return {
        success: true,
        data,
        widget: {
          type: 'forecast-viewer',
          data: {
            run_id: data.id || data.run_id,
            status: data.status,
            product_id,
            warehouse_id,
            model_type,
            horizon_days
          }
        }
      };
    }
  },

  compare_forecasts: {
    name: 'compare_forecasts',
    description: 'Compare the most recent run of each forecast model (moving average, random forest, exponential smoothing).',
    execute: async (params = {}) => {
      const { product_id, warehouse_id } = params;
      const data = await forecastApi.compareForecastRuns({
        productId: parseInt(product_id),
        warehouseId: parseInt(warehouse_id)
      });
      return {
        success: true,
        data,
        widget: {
          type: 'forecast-viewer',
          data: {
            isComparison: true,
            comparisonData: data,
            product_id,
            warehouse_id
          }
        }
      };
    }
  },

  // 5. Stock & Inventory
  get_stock_levels: {
    name: 'get_stock_levels',
    description: 'Query current on-hand and available stock across warehouses.',
    execute: async (params = {}) => {
      const data = await stockApi.listStock({ limit: params.limit || 10 });
      const items = data.items || data || [];
      return {
        success: true,
        data: items,
        widget: {
          type: 'stock-table',
          data: items
        }
      };
    }
  },

  adjust_stock: {
    name: 'adjust_stock',
    description: 'Adjust on-hand inventory levels for a product at a specific warehouse.',
    execute: async (params) => {
      const { product_id, warehouse_id, quantity_delta } = params;
      // schemas.StockAdjustment has no freeform "reason"/notes field (only
      // movement_type/reference_type/reference_id, meant for structured
      // references like a PO id) — sending one would be a silently-dropped
      // no-op, so it's left out here rather than implying it's persisted.
      const data = await stockApi.adjustStock({
        product_id: parseInt(product_id),
        warehouse_id: parseInt(warehouse_id),
        quantity_delta: parseInt(quantity_delta)
      });
      return {
        success: true,
        data,
        widget: {
          type: 'stock-adjusted',
          data
        }
      };
    }
  },

  // 6. Purchase Orders
  list_purchase_orders: {
    name: 'list_purchase_orders',
    description: 'Fetch purchase orders with optional status filter.',
    execute: async (params = {}) => {
      const data = await poApi.listPurchaseOrders({ limit: params.limit || 10 });
      const items = data.items || data || [];
      return {
        success: true,
        data: items,
        widget: {
          type: 'po-stepper',
          data: items
        }
      };
    }
  },

  create_purchase_order: {
    name: 'create_purchase_order',
    description: 'Create a draft purchase order for a supplier and warehouse.',
    execute: async (params) => {
      const { supplier_id, warehouse_id, items, expected_delivery_date } = params;
      // schemas.PurchaseOrderCreate's line items are `quantity_ordered`/
      // `unit_cost` (not `quantity`/`unit_price`) and the payload itself
      // has no `notes` field — sending those names was silently dropped by
      // Pydantic's default "ignore extra fields" behavior for `notes`, but
      // `quantity_ordered` is required (Field(gt=0)) with no fallback, so
      // omitting it was a hard 422 on every PO created from the copilot.
      const data = await poApi.createPurchaseOrder({
        supplier_id: parseInt(supplier_id),
        warehouse_id: parseInt(warehouse_id),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity_ordered: parseInt(item.quantity_ordered ?? item.quantity),
          unit_cost: parseFloat(item.unit_cost ?? item.unit_price ?? 0)
        })),
        expected_delivery_date: expected_delivery_date || null
      });
      return {
        success: true,
        data,
        widget: {
          type: 'po-stepper',
          data: [data]
        }
      };
    }
  },

  // 7. Products, Warehouses, Suppliers metadata
  list_products: {
    name: 'list_products',
    description: 'Search product catalog by SKU, name, or category.',
    execute: async (params = {}) => {
      const data = await productsApi.listProducts(false, params);
      return {
        success: true,
        data: data.items || data
      };
    }
  },

  list_warehouses: {
    name: 'list_warehouses',
    description: 'List all warehouses.',
    execute: async () => {
      const data = await warehousesApi.listWarehouses();
      return {
        success: true,
        data: data.items || data
      };
    }
  },

  list_suppliers: {
    name: 'list_suppliers',
    description: 'List suppliers with lead times and contact details.',
    execute: async () => {
      const data = await suppliersApi.listSuppliers();
      return {
        success: true,
        data: data.items || data
      };
    }
  },

  // 8. EDA
  get_eda: {
    name: 'get_eda',
    description: 'Fetch sales analysis charts and metrics from the most recent upload.',
    execute: async () => {
      const data = await edaApi.getEda();
      return {
        success: true,
        data,
        widget: {
          type: 'eda-overview',
          data
        }
      };
    }
  }
};
