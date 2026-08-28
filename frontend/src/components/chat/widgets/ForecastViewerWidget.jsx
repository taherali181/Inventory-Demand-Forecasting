import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useChartTheme, chartAxisProps, chartGridProps, chartTooltipProps } from '../../../charts/theme';
import { useAppStore } from '../../../store/useAppStore';

// Line colors per model type — zinc + restrained accents, not a full neon
// palette; kept stable across renders so the same model always draws the
// same color.
const MODEL_COLOR = {
  random_forest: '#e4e4e7', // zinc-200
  exponential_smoothing: '#60a5fa', // status-info
  moving_average: '#fbbf24' // status-warn
};

const MODEL_LABEL = {
  random_forest: 'Random forest',
  exponential_smoothing: 'Exponential smoothing',
  moving_average: 'Moving average'
};

// Merges each run's predictions ({forecast_date, predicted_sales}) into one
// array keyed by date, one column per model_type, for a single recharts
// <LineChart>.
function mergeRunsForChart(runs) {
  const byDate = new Map();
  for (const run of runs) {
    for (const p of run.predictions || []) {
      const row = byDate.get(p.forecast_date) || { date: p.forecast_date };
      row[run.model_type] = p.predicted_sales;
      byDate.set(p.forecast_date, row);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Consumes either:
//  - run_forecast's widget: {run_id, status, product_id, warehouse_id,
//    model_type, horizon_days} — POST /forecast just returns the pending
//    ForecastRunRead; no predictions exist yet, training runs in the
//    background.
//  - compare_forecasts' widget: {isComparison: true, comparisonData,
//    product_id, warehouse_id} — GET /forecast/compare returns
//    List[ForecastRunRead], each with real predictions/mae/rmse.
export const ForecastViewerWidget = ({ data = {} }) => {
  const chart = useChartTheme();
  const { setActiveStudioView } = useAppStore();
  const runs = useMemo(
    () => (data.isComparison ? (data.comparisonData || []) : []),
    [data.isComparison, data.comparisonData]
  );
  const chartData = useMemo(() => mergeRunsForChart(runs), [runs]);
  const modelTypes = useMemo(
    () => Array.from(new Set(runs.map((r) => r.model_type))),
    [runs]
  );

  const header = (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline/[0.06]">
      <div className="flex items-center gap-2 min-w-0">
        <TrendingUp className="w-3.5 h-3.5 text-content-muted shrink-0" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary truncate">
          Demand forecast · Product #{data.product_id} · Warehouse #{data.warehouse_id}
        </span>
      </div>
      <button
        onClick={() => setActiveStudioView('forecast')}
        className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 shrink-0 transition-colors"
      >
        Sandbox <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );

  // Mode A: a run was just scheduled — no predictions to plot yet.
  if (!data.isComparison) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mt-3 rounded-lg glass-card border border-hairline/[0.08] overflow-hidden"
      >
        {header}
        <div className="px-3.5 py-3 flex items-center gap-2.5 text-xs text-content-secondary">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-content-muted shrink-0" />
          <span>
            Run #{data.run_id} scheduled ({MODEL_LABEL[data.model_type] || data.model_type}, {data.horizon_days}-day horizon) —
            training in the background. Use <code className="px-1 py-0.5 rounded bg-surface-2 text-content-secondary font-mono text-[10px]">/forecast</code> again shortly to compare it once it completes.
          </span>
        </div>
      </motion.div>
    );
  }

  // Mode B: comparison of each model type's most recent completed run.
  if (runs.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-surface/60 border border-hairline/[0.06] text-content-secondary text-xs">
        No completed forecast runs yet for Product #{data.product_id} at Warehouse #{data.warehouse_id} — run <code className="px-1 py-0.5 rounded bg-surface-2 text-content-secondary font-mono text-[10px]">/forecast</code> to train one.
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
      {header}

      <div className="h-48 w-full px-2.5 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...chartGridProps(chart)} />
            <XAxis dataKey="date" {...chartAxisProps(chart)} minTickGap={24} />
            <YAxis {...chartAxisProps(chart)} />
            <Tooltip {...chartTooltipProps(chart)} />
            <Legend wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }} formatter={(value) => MODEL_LABEL[value] || value} />
            {modelTypes.map((mt) => (
              <Line
                key={mt}
                type="monotone"
                dataKey={mt}
                name={mt}
                stroke={MODEL_COLOR[mt] || chart.series[0]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-px bg-surface-2/[0.05] mt-2.5" style={{ gridTemplateColumns: `repeat(${runs.length}, minmax(0, 1fr))` }}>
        {runs.map((run) => (
          <div key={run.id} className="p-2.5 bg-canvas/40 text-[10px]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: MODEL_COLOR[run.model_type] || '#a1a1aa' }} />
              <span className="text-content-secondary font-medium truncate">{MODEL_LABEL[run.model_type] || run.model_type}</span>
            </div>
            <div className="text-content-muted font-mono">
              MAE {run.mae !== null && run.mae !== undefined ? run.mae.toFixed(2) : '—'} · RMSE {run.rmse !== null && run.rmse !== undefined ? run.rmse.toFixed(2) : '—'}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
