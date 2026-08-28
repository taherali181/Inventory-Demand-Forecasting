import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Activity, Boxes, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /dashboard/kpis — schemas.DashboardKpis: period_days,
// total_sales_in_period, total_quantity_on_hand, inventory_turnover
// (nullable), stockout_rate (a 0-1 fraction, nullable), stockout_count,
// stock_level_count, forecast_mae (nullable), forecast_mape (already a
// 0-100 percentage — not a fraction, don't re-multiply by 100),
// forecast_sample_size. Per CLAUDE.md: a null value means the backend
// genuinely has nothing to compute it from yet, not a fetch error — shown
// as "—", never a made-up placeholder number.
const fmt = (value, formatter) => (value === null || value === undefined ? '—' : formatter(value));

export const KPISummaryWidget = ({ data = {} }) => {
  const { setActiveStudioView } = useAppStore();

  const metrics = [
    {
      label: 'Inventory turnover',
      value: fmt(data.inventory_turnover, (v) => `${Number(v).toFixed(2)}x`),
      sub: `${data.periodDays ?? data.period_days ?? 30}-day sales / on-hand`,
      icon: Activity
    },
    {
      label: 'Stockout rate',
      value: fmt(data.stockout_rate, (v) => `${(Number(v) * 100).toFixed(1)}%`),
      sub: data.stockout_count !== undefined ? `${data.stockout_count} of ${data.stock_level_count} stock rows` : 'of tracked stock rows',
      icon: AlertTriangle
    },
    {
      label: 'Forecast accuracy',
      // forecast_mape is already a percentage (0-100) computed server-side —
      // multiplying by 100 again here was the bug.
      value: fmt(data.forecast_mape, (v) => `${Math.max(0, 100 - Number(v)).toFixed(1)}%`),
      sub: data.forecast_sample_size ? `n=${data.forecast_sample_size} predictions vs. actuals` : 'no matched actuals yet',
      icon: TrendingUp
    },
    {
      label: 'Units on hand',
      value: fmt(data.total_quantity_on_hand, (v) => Number(v).toLocaleString()),
      sub: 'across all warehouses',
      icon: Boxes
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mt-3 rounded-lg glass-card border border-hairline/[0.08] overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline/[0.06]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-content-muted" />
          Performance snapshot
        </span>
        <button
          onClick={() => setActiveStudioView('dashboard')}
          className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 transition-colors"
        >
          Full dashboard <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-2/[0.05]">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-3 bg-canvas/40 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-content-muted truncate">{m.label}</span>
                <Icon className="w-3.5 h-3.5 text-content-muted" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-content font-mono">{m.value}</div>
                <div className="text-[10px] text-content-muted">{m.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
