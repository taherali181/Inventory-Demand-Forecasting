import React from 'react';
import { motion } from 'framer-motion';
import { Boxes, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /stock (or POST /stock/adjust's single-row result) —
// schemas.StockLevelRead: id, product_id, warehouse_id, quantity_on_hand,
// quantity_reserved, quantity_available, last_updated_at. No product/
// warehouse name and no reorder_point on this shape (that lives on
// Product, a separate call) — only real fields are rendered.
export const StockTableWidget = ({ data = [] }) => {
  const items = Array.isArray(data) ? data : (data.items ? data.items : [data]);
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
          <Boxes className="w-3.5 h-3.5 text-content-muted" />
          Stock levels
        </span>
        <button
          onClick={() => setActiveStudioView('inventory')}
          className="text-[11px] text-content-secondary hover:text-content flex items-center gap-1 transition-colors"
        >
          Full inventory <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-content-muted">
              <th className="py-1.5 px-3.5 font-normal">Product</th>
              <th className="py-1.5 px-3.5 font-normal">Warehouse</th>
              <th className="py-1.5 px-3.5 font-normal text-right">On hand</th>
              <th className="py-1.5 px-3.5 font-normal text-right">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/[0.05]">
            {items.slice(0, 5).map((stock, idx) => {
              const isOut = (stock.quantity_available ?? 0) <= 0;
              return (
                <tr key={stock.id || idx} className="hover:bg-surface-2/[0.02]">
                  <td className="py-2 px-3.5 font-medium text-content">
                    Product #{stock.product_id}
                  </td>
                  <td className="py-2 px-3.5 text-content-muted">
                    Warehouse #{stock.warehouse_id}
                  </td>
                  <td className="py-2 px-3.5 text-right font-mono text-content-secondary">
                    {stock.quantity_on_hand ?? '—'}
                  </td>
                  <td className="py-2 px-3.5 text-right font-mono font-medium">
                    <span className={isOut ? 'text-status-bad' : 'text-content'}>
                      {stock.quantity_available ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
