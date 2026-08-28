import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle2, AlertOctagon, WifiOff } from 'lucide-react';
import * as alertsApi from '../../api/alerts';
import * as productsApi from '../../api/products';
import * as warehousesApi from '../../api/warehouses';
export const AlertsStudio = () => {
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  useEffect(() => {
    productsApi.listProducts(true, { limit: 200 }).then((res) => setProducts(res.items || [])).catch(() => {});
    warehousesApi.listWarehouses(true, { limit: 200 }).then((res) => setWarehouses(res.items || [])).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      // AlertStatus only has open/acknowledged/resolved on the backend —
      // "all" is a frontend-only concept, so omit status_filter entirely
      // rather than sending an invalid enum value (which 422s).
      const res = await alertsApi.listAlerts(statusFilter === 'all' ? undefined : statusFilter);
      setAlerts(res.items || []);
      setIsOffline(false);
    } catch (e) {
      setAlerts([]);
      setIsOffline(true);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      await alertsApi.recomputeAlerts();
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleResolve = async (id) => {
    // There is no per-alert resolve endpoint on the backend — alerts are
    // only ever auto-resolved by POST /alerts/recompute, which re-checks
    // every product/warehouse pair's real current stock against its
    // reorder point. api/alerts.js's resolveAlert() is that recompute
    // call; re-fetch afterward instead of optimistically removing the row,
    // since recompute only actually resolves this alert if stock has
    // genuinely recovered.
    try {
      await alertsApi.resolveAlert(id);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-status-bad" />
            <span>Low-Stock Alert Triage</span>
          </h2>
          <p className="text-xs text-content-muted">Manage inventory threshold violations</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecompute}
            disabled={isRecomputing}
            className="px-3.5 py-1.5 rounded-lg bg-status-bad/10 hover:bg-status-bad/20 text-status-bad border border-status-bad/30 text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 active:scale-95 disabled:opacity-50"
            title="Re-checks every product/warehouse pair's current stock against its reorder point — opens new alerts and auto-resolves recovered ones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecomputing ? 'animate-spin' : ''}`} />
            <span>Recompute Alerts</span>
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-bad/30 bg-status-bad/10 text-status-bad text-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Could not reach the alerts API — showing no rows rather than a fabricated preview.</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        {['open', 'resolved', 'all'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors duration-150 ${
              statusFilter === st
                ? 'bg-surface-2 text-content border border-hairline-strong'
                : 'text-content-muted hover:text-content'
            }`}
          >
            {st} Alerts
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl glass-card border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-status-bad/10 text-status-bad border border-status-bad/30 mt-0.5">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-content text-sm">
                  {productMap[a.product_id]?.name || `Product #${a.product_id}`}
                </div>
                <div className="text-content-muted text-xs mt-0.5">
                  Location: <span className="text-content-secondary">{warehouseMap[a.warehouse_id]?.name || `Warehouse #${a.warehouse_id}`}</span>
                </div>
                <div className="text-[11px] text-content-muted mt-1">
                  {a.alert_type} · Triggered {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline">
              <div className="text-right">
                <div className="text-status-bad font-mono font-semibold text-base">
                  {a.current_value ?? 0} Left
                </div>
                <div className="text-[10px] text-content-muted">
                  Threshold: {a.threshold_value ?? 0}
                </div>
              </div>

              {a.status === 'open' && (
                <button
                  onClick={() => handleResolve(a.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-2 text-content border border-hairline-strong/80 text-xs font-medium flex items-center gap-1.5 transition-colors duration-150"
                  title="Triggers a full alerts recompute — resolves this alert only if its stock has genuinely recovered"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-good" />
                  <span>Recheck & Resolve</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="p-12 rounded-2xl glass-card border border-hairline text-center text-content-muted text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-status-good" />
            <span>No alerts found for this filter. All inventory thresholds satisfied.</span>
          </div>
        )}
      </div>
    </div>
  );
};
