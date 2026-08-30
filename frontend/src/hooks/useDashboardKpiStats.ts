import { useEffect, useState } from 'react';
import { getDashboardKpis } from '../api/dashboard';
import { listOpenAlerts } from '../api/alerts';
import { formatMultiplier, formatPercent } from '../lib/format';
import type { KPIStat } from '../components/chat';

export interface DashboardKpiStatsResult {
  loading: boolean;
  error: string | null;
  stats: KPIStat[];
}

/**
 * Real equivalent of the mockup's fixed "Turnover / Stockout rate / Open alerts" KPI grid (Main.dc.html,
 * `KPIStatGrid`) — `GET /dashboard/kpis` for the first two, `GET /alerts?status_filter=open` for the third
 * (DashboardKpis has no open-alert count of its own). A null KPI value renders "—", the dashboard's
 * existing convention for "not enough data yet", never a fabricated number.
 */
export function useDashboardKpiStats(): DashboardKpiStatsResult {
  const [state, setState] = useState<DashboardKpiStatsResult>({ loading: true, error: null, stats: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [kpis, openAlerts] = await Promise.all([getDashboardKpis(), listOpenAlerts()]);
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          stats: [
            { label: 'Turnover', value: formatMultiplier(kpis.inventory_turnover) },
            { label: 'Stockout rate', value: formatPercent(kpis.stockout_rate) },
            { label: 'Open alerts', value: String(openAlerts.length), emphasis: 'warn' },
          ],
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load dashboard KPIs.',
            // Same "—" convention as a null KPI value — a failed fetch is an honest unknown, not a 0.
            stats: [
              { label: 'Turnover', value: '—' },
              { label: 'Stockout rate', value: '—' },
              { label: 'Open alerts', value: '—', emphasis: 'warn' },
            ],
          });
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
