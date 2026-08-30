/**
 * Thin TypeScript mirrors of `backend/schemas.py`'s Pydantic response models — only the fields this
 * frontend actually reads. Field names/shapes are transcribed from that file directly, not guessed; see
 * root CLAUDE.md's backend section for the endpoints these come from.
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export type UserRole = 'admin' | 'staff';

export interface UserRead {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenOnly {
  access_token: string;
  token_type: string;
}

export interface WarehouseRead {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplierRead {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductRead {
  id: number;
  sku_code: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_of_measure: string;
  unit_cost: number;
  unit_price: number;
  default_supplier_id: number | null;
  reorder_point: number;
  safety_stock: number;
  reorder_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertRead {
  id: number;
  product_id: number;
  warehouse_id: number;
  alert_type: string;
  threshold_value: number;
  current_value: number;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface PurchaseOrderItemRead {
  id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

export interface PurchaseOrderRead {
  id: number;
  po_number: string;
  supplier_id: number;
  warehouse_id: number;
  status: PurchaseOrderStatus;
  order_date: string | null;
  expected_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemRead[];
}

export interface ForecastPredictionRead {
  forecast_date: string;
  predicted_sales: number;
}

export type ForecastRunStatus = 'pending' | 'completed' | 'failed';

export interface ForecastRunRead {
  id: number;
  product_id: number | null;
  warehouse_id: number | null;
  model_type: string;
  forecast_horizon: number;
  trained_at: string;
  rmse: number | null;
  mae: number | null;
  status: ForecastRunStatus;
  predictions: ForecastPredictionRead[];
}

export interface ReorderSuggestion {
  product_id: number;
  warehouse_id: number;
  current_stock: number;
  forecasted_demand: number;
  reorder_point: number;
  suggested_order_quantity: number;
  forecast_run_id: number;
}

export interface DashboardKpis {
  period_days: number;
  total_sales_in_period: number;
  total_quantity_on_hand: number;
  inventory_turnover: number | null;
  stockout_rate: number | null;
  stockout_count: number;
  stock_level_count: number;
  forecast_mae: number | null;
  forecast_mape: number | null;
  forecast_sample_size: number;
}
