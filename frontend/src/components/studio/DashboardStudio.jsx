import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Layers,
  WifiOff
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import * as dashboardApi from '../../api/dashboard';
import { useChartTheme, chartAxisProps, chartGridProps, chartTooltipProps } from '../../charts/theme';
// `null` fields on DashboardKpis are genuinely undefined ratios (e.g. no
// stock on hand to divide by), not zero — render them as "—", per
// CLAUDE.md's documented convention, rather than a fabricated number.
const fmtMultiple = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(2)}x`);
const fmtPercent = (v) => (v === null || v === undefined ? '—' : `${(Number(v) * 100).toFixed(1)}%`);
const fmtAccuracy = (mape) => (mape === null || mape === undefined ? '—' : `${Math.max(0, 100 - Number(mape) * 100).toFixed(1)}%`);

export const DashboardStudio = () => {
  const chart = useChartTheme();
  const [period, setPeriod] = useState(30);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getDashboardKpis(period);
      setKpis(res);
      setIsOffline(false);
    } catch (e) {
      // Backend unreachable — surface an honest empty state rather than a
      // fabricated set of numbers that would be indistinguishable from a
      // real, live response.
      setKpis(null);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Sourced entirely from real DashboardKpis fields — no fabricated
  // weekly time series (the backend has no aggregate actuals-vs-forecast
  // trend endpoint to back one).
  const salesVsStockData = kpis
    ? [
        { name: `Sales (${period}d)`, value: Math.round(kpis.total_sales_in_period) },
        { name: 'On hand now', value: kpis.total_quantity_on_hand },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Plain "Dashboard" — the old "Supply Chain Intelligence Dashboard"
              overclaimed. Keep a heading matching /dashboard/i: it is the only
              element satisfying App.test.js's getByRole('heading') assertion,
              and getByRole is singular, so there must be exactly one. */}
          <h2 className="text-lg font-semibold text-content">Dashboard</h2>
          <p className="text-xs text-content-muted">
            Inventory and forecast metrics, last {period} days
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => {
                setPeriod(d);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-150 ${
                period === d
                  ? 'bg-surface-2 text-content border border-hairline-strong'
                  : 'bg-canvas/60 text-content-muted hover:text-content border border-hairline'
              }`}
            >
              {d} Days
            </button>
          ))}

          <button
            onClick={() => {
              fetchKpis();
            }}
            className="p-1.5 rounded-lg bg-canvas/60 text-content-muted hover:text-content border border-hairline transition-colors duration-150"
            title="Refresh KPIs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-bad/30 bg-status-bad/10 text-status-bad text-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Could not reach the dashboard API — showing no data rather than a fabricated preview.</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted font-medium">Inventory Turnover</span>
            <Activity className="w-4 h-4 text-status-info" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-content font-mono">
            {fmtMultiple(kpis?.inventory_turnover)}
          </div>
          <div className="mt-1 text-[11px] text-content-muted">
            {kpis ? `${Math.round(kpis.total_sales_in_period)} sold / ${kpis.total_quantity_on_hand} on hand` : 'No data'}
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted font-medium">Stockout Rate</span>
            <AlertTriangle className="w-4 h-4 text-status-warn" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-content font-mono">
            {fmtPercent(kpis?.stockout_rate)}
          </div>
          <div className="mt-1 text-[11px] text-content-muted">
            {kpis ? `${kpis.stockout_count} of ${kpis.stock_level_count} stock rows at 0` : 'No data'}
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted font-medium">Forecast Accuracy</span>
            <TrendingUp className="w-4 h-4 text-status-good" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-content font-mono">
            {fmtAccuracy(kpis?.forecast_mape)}
          </div>
          <div className="mt-1 text-[11px] text-content-muted">
            {kpis?.forecast_mape !== null && kpis?.forecast_mape !== undefined
              ? `MAPE ${(kpis.forecast_mape * 100).toFixed(1)}% · MAE ${kpis.forecast_mae?.toFixed(2) ?? '—'}`
              : 'No matched predictions yet'}
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-xs text-content-muted font-medium">Forecast Samples</span>
            <Layers className="w-4 h-4 text-content-secondary" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-content font-mono">
            {kpis?.forecast_sample_size ?? '—'}
          </div>
          <div className="mt-1 text-[11px] text-content-muted">
            Predictions matched against actual sales in this window
          </div>
        </div>
      </div>

      {/* Chart Section: real KPI-derived comparison, not a fabricated trend */}
      <div className="p-5 rounded-2xl glass-card border border-hairline space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            Sales in Period vs Current Stock on Hand
          </span>
          <span className="text-xs text-content-muted font-mono">last {period}d</span>
        </div>

        <div className="h-56 w-full">
          {salesVsStockData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesVsStockData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid {...chartGridProps(chart)} />
                <XAxis dataKey="name" {...chartAxisProps(chart)} />
                <YAxis {...chartAxisProps(chart)} />
                <Tooltip {...chartTooltipProps(chart)} />
                <Bar dataKey="value" fill={chart.series[0]} radius={[6, 6, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-content-muted">
              {loading ? 'Loading…' : 'No data available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
