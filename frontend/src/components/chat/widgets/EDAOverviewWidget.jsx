import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /eda — eda.py's perform_eda() dict: summary_statistics
// (pandas .describe() per column, so summary_statistics.sales.count is the
// row count), missing_values, unique_stores, unique_items, plus 4 base64
// chart images. There is no total_rows/unique_products/seasonality_score
// field — those were fabricated. A still-processing upload returns
// {status: "processing", upload_id} (202), handled explicitly below rather
// than falling through to blank/fake stats.
export const EDAOverviewWidget = ({ data = {} }) => {
  const { setActiveStudioView } = useAppStore();

  if (data.status === 'processing') {
    return (
      <div className="mt-3 p-3 rounded-lg bg-surface/60 border border-hairline/[0.06] text-content-secondary text-xs flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        Upload #{data.upload_id} is still processing — EDA charts aren't ready yet.
      </div>
    );
  }

  const totalRows = data.summary_statistics?.sales?.count;

  const stats = [
    { label: 'Sales rows', value: totalRows !== undefined ? Math.round(totalRows).toLocaleString() : '—' },
    { label: 'Unique products', value: data.unique_items ?? '—' },
    { label: 'Unique warehouses', value: data.unique_stores ?? '—' }
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
          <BarChart3 className="w-3.5 h-3.5 text-content-muted" />
          Sales EDA
        </span>
        <button
          onClick={() => setActiveStudioView('eda')}
          className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 transition-colors"
        >
          Full report <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-surface-2/[0.05]">
        {stats.map((s) => (
          <div key={s.label} className="p-3 bg-canvas/40">
            <div className="text-[10px] text-content-muted">{s.label}</div>
            <div className="text-base font-semibold font-mono text-content mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {data.sales_trend_image && (
        <div className="p-2.5 border-t border-hairline/[0.05]">
          <img
            src={`data:image/png;base64,${data.sales_trend_image}`}
            alt="Sales trend over time"
            className="w-full rounded-md border border-hairline/[0.06]"
          />
        </div>
      )}
    </motion.div>
  );
};
