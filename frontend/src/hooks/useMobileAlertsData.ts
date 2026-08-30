import { useEffect, useState } from 'react';
import { listOpenAlerts } from '../api/alerts';
import { getProductsMap } from '../api/lookups';
import type { Severity } from '../components/ui';

export interface MobileAlertRow {
  severity: Severity;
  title: string;
  meta: string;
}

/**
 * Mobile.dc.html's alert rows omit the warehouse name that the desktop `AlertRow` includes (source meta:
 * "12 left · reorder pt 50", no warehouse) — reproduced literally here rather than "fixing" it to match
 * desktop's fuller meta line.
 */
export function useMobileAlertsData(): { loading: boolean; alerts: MobileAlertRow[] } {
  const [state, setState] = useState<{ loading: boolean; alerts: MobileAlertRow[] }>({
    loading: true,
    alerts: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [openAlerts, products] = await Promise.all([listOpenAlerts(), getProductsMap()]);
        if (cancelled) return;
        setState({
          loading: false,
          alerts: openAlerts.map((alert) => {
            const product = products.get(alert.product_id);
            const severity: Severity = alert.current_value <= alert.threshold_value * 0.5 ? 'bad' : 'warn';
            const title = product ? `${product.name} — ${product.sku_code}` : `Product #${alert.product_id}`;
            const stockValue = Number.isInteger(alert.current_value)
              ? alert.current_value
              : alert.current_value.toFixed(1);
            return { severity, title, meta: `${stockValue} left · reorder pt ${alert.threshold_value}` };
          }),
        });
      } catch {
        if (!cancelled) setState({ loading: false, alerts: [] });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
