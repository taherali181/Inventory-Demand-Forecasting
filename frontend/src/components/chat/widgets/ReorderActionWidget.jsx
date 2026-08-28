import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Loader2, PackagePlus } from 'lucide-react';
import { AgentEngine } from '../../../ai/agentEngine';
import { useAppStore } from '../../../store/useAppStore';

// Consumes GET /reorder/suggestions — schemas.ReorderSuggestion: product_id,
// warehouse_id, current_stock, forecasted_demand, reorder_point,
// suggested_order_quantity, forecast_run_id. No product/warehouse name, no
// supplier, no unit price — every field rendered below is one that field
// actually returns; nothing here is invented.
export const ReorderActionWidget = ({ data = [] }) => {
  const items = Array.isArray(data) ? data : (data.items || []);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [approvedMap, setApprovedMap] = useState({});
  const { addMessage, setActiveStudioView } = useAppStore();

  if (items.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-surface/60 border border-hairline/[0.06] text-content-secondary text-xs">
        No active reorder suggestions — stock covers forecasted demand everywhere.
      </div>
    );
  }

  const handleQuickCreatePO = async (item, index) => {
    setLoadingIndex(index);
    try {
      // GET /reorder/suggestions never returns a supplier — there's no
      // supplier lookup tied to this data without a new backend call, so
      // this stays a known gap (supplier_id: 1) rather than fabricating
      // one. See toolRegistry.create_purchase_order for the real
      // PurchaseOrderCreate field names (quantity_ordered/unit_cost).
      const payload = {
        supplier_id: 1,
        warehouse_id: item.warehouse_id,
        items: [
          {
            product_id: item.product_id,
            quantity_ordered: item.suggested_order_quantity || 1,
            unit_cost: 0
          }
        ]
      };

      const result = await AgentEngine.executeDirectAction('create_po', payload);
      if (result.success) {
        setApprovedMap((prev) => ({ ...prev, [index]: result.data.id }));
        addMessage({
          sender: 'ai',
          text: result.message,
          widgets: [
            {
              type: 'po-stepper',
              data: [result.data]
            }
          ]
        });
      }
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mt-3 rounded-lg glass-card border border-hairline/[0.08] overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline/[0.06]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-content-secondary">
          Reorder suggestions ({items.length})
        </span>
        <button
          onClick={() => setActiveStudioView('purchase-orders')}
          className="text-[11px] text-content-secondary hover:text-content transition-colors"
        >
          View purchase orders
        </button>
      </div>

      <div className="divide-y divide-hairline/[0.05]">
        {items.slice(0, 3).map((item, idx) => {
          const isApproved = approvedMap[idx];
          const isLoading = loadingIndex === idx;
          const qty = item.suggested_order_quantity;

          return (
            <div
              key={idx}
              className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="font-medium text-content flex items-center gap-2">
                  <span>Product #{item.product_id}</span>
                  <span className="text-[10px] text-content-muted font-normal">
                    · Warehouse #{item.warehouse_id}
                  </span>
                </div>
                <div className="text-[11px] text-content-muted">
                  {item.current_stock} on hand &middot; {Math.round(item.forecasted_demand)} forecasted demand &middot; reorder point {item.reorder_point}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/[0.05] shrink-0">
                <div className="text-right font-mono text-status-warn text-[13px] font-medium">
                  +{qty}
                </div>

                {isApproved ? (
                  <div className="px-2.5 py-1.5 rounded-md bg-status-good/10 text-status-good border border-status-good/25 flex items-center gap-1 text-[11px] font-medium">
                    <Check className="w-3.5 h-3.5" />
                    PO #{isApproved}
                  </div>
                ) : (
                  <button
                    onClick={() => handleQuickCreatePO(item, idx)}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-accent-fg font-medium flex items-center gap-1.5 transition-colors active:scale-[0.97] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                    <span>Create PO</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3.5 py-2 border-t border-hairline/[0.05] text-[10px] text-content-muted flex items-center gap-1.5">
        <PackagePlus className="w-3 h-3" />
        Quantities from Product.reorder_quantity, or a computed shortfall — see GET /reorder/suggestions.
      </div>
    </motion.div>
  );
};
