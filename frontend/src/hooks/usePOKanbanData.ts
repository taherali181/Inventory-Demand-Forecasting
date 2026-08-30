import { useEffect, useState } from 'react';
import { listPurchaseOrders } from '../api/purchaseOrders';
import { getSuppliersMap } from '../api/lookups';
import { formatCurrency } from '../lib/format';
import { KANBAN_COLUMNS } from '../components/canvas/kanban';
import type { SampleColumnData, SamplePOCardData } from '../components/canvas/kanban';
import type { PurchaseOrderRead } from '../api/types';

function poCardData(po: PurchaseOrderRead, supplierName: string): SamplePOCardData {
  const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const totalReceived = po.items.reduce((sum, item) => sum + item.quantity_received, 0);
  const totalCost = po.items.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0);

  if (po.status === 'partially_received') {
    return {
      poNumber: po.po_number,
      supplier: supplierName,
      meta: `${totalReceived} of ${totalOrdered} items received`,
      progress: { received: totalReceived, total: totalOrdered },
    };
  }

  const itemLabel = po.items.length === 1 ? 'item' : 'items';
  return {
    poNumber: po.po_number,
    supplier: supplierName,
    meta: `${po.items.length} ${itemLabel} · ${formatCurrency(totalCost)}`,
  };
}

export interface POKanbanData {
  loading: boolean;
  error: string | null;
  columns: SampleColumnData[];
}

/** Fetches real purchase orders and groups them into the 6 Kanban columns (design brief, Layer 3 Group B). */
export function usePOKanbanData(): POKanbanData {
  const [state, setState] = useState<POKanbanData>({ loading: true, error: null, columns: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [purchaseOrders, suppliers] = await Promise.all([listPurchaseOrders(200), getSuppliersMap()]);

        const columns: SampleColumnData[] = KANBAN_COLUMNS.map((def) => {
          const cards = purchaseOrders
            .filter((po) => po.status === def.status)
            .map((po) => poCardData(po, suppliers.get(po.supplier_id)?.name ?? `Supplier #${po.supplier_id}`));
          return { status: def.status, count: cards.length, cards };
        });

        if (!cancelled) {
          setState({ loading: false, error: null, columns });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load purchase orders.',
          }));
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
