import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /alerts — schemas.AlertRead: id, product_id, warehouse_id,
// alert_type, threshold_value, current_value, status, created_at,
// resolved_at. No product/warehouse name, no "available"/"reorder_point" —
// current_value/threshold_value are the real fields for those.
export const AlertsRadarWidget = ({ data = [] }) => {
  const { setActiveStudioView } = useAppStore();
  const alerts = Array.isArray(data) ? data : (data.items || []);

  if (alerts.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-status-good/[0.06] border border-status-good/20 text-status-good text-xs flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>No open alerts — every stock level is above its reorder point.</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mt-3 rounded-lg glass-card border border-hairline/[0.08] overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline/[0.06]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-status-bad" />
          Open alerts ({alerts.length})
        </span>
        <button
          onClick={() => setActiveStudioView('alerts')}
          className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 transition-colors"
        >
          Triage <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="divide-y divide-hairline/[0.05]">
        {alerts.slice(0, 4).map((alert, idx) => (
          <div
            key={alert.id || idx}
            className="px-3.5 py-2.5 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-status-bad shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-content truncate">
                  Product #{alert.product_id} <span className="text-content-muted font-normal">· Warehouse #{alert.warehouse_id}</span>
                </div>
                <div className="text-[11px] text-content-muted capitalize">
                  {(alert.alert_type || 'low_stock').replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 pl-3">
              <div className="font-mono font-medium text-status-bad">
                {alert.current_value} left
              </div>
              <div className="text-[10px] text-content-muted">
                threshold {alert.threshold_value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
