import React from 'react';
import { motion } from 'framer-motion';
import { Package, ArrowRight, Truck } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /purchase-orders ({items, total}) or a single
// schemas.PurchaseOrderRead: id, po_number, supplier_id, warehouse_id,
// status, order_date, expected_delivery_date, created_at, updated_at,
// items: [{id, product_id, quantity_ordered, quantity_received, unit_cost}].
const STATUS_STYLE = {
  received: 'bg-status-good/10 text-status-good border-status-good/25',
  approved: 'bg-status-info/10 text-status-info border-status-info/25',
  submitted: 'bg-surface-2 text-content-secondary border-hairline-strong',
  cancelled: 'bg-status-bad/10 text-status-bad border-status-bad/25'
};

const StatusBadge = ({ status }) => (
  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${STATUS_STYLE[status?.toLowerCase()] || 'bg-surface-2 text-content-secondary border-hairline-strong'}`}>
    {status || 'draft'}
  </span>
);

export const POStepperWidget = ({ data = [] }) => {
  const pos = Array.isArray(data) ? data : [data];
  const { setActiveStudioView } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mt-3 rounded-lg glass-card border border-hairline/[0.08] overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline/[0.06]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-content-muted" />
          Purchase orders
        </span>
        <button
          onClick={() => setActiveStudioView('purchase-orders')}
          className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 transition-colors"
        >
          Kanban board <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="divide-y divide-hairline/[0.05]">
        {pos.slice(0, 3).map((po, idx) => (
          <div
            key={po.id || idx}
            className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-content">{po.po_number || `PO #${po.id}`}</span>
                <StatusBadge status={po.status} />
              </div>
              <div className="text-[11px] text-content-muted flex items-center gap-2 flex-wrap">
                <span>Supplier #{po.supplier_id}</span>
                <span className="text-content-muted">&middot;</span>
                <span>Warehouse #{po.warehouse_id}</span>
                {po.expected_delivery_date && (
                  <>
                    <span className="text-content-muted">&middot;</span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-content-muted" />
                      ETA {new Date(po.expected_delivery_date).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            <span className="font-mono text-content-secondary shrink-0">
              {po.items?.length ?? 0} item{(po.items?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
