import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Truck, RefreshCw, Send, Check, WifiOff } from 'lucide-react';
import * as poApi from '../../api/purchaseOrders';
// PurchaseOrderStatus values actually supported by the backend
// (models.PurchaseOrderStatus / the _ALLOWED_TRANSITIONS map in
// routers/purchase_orders.py). partially_received and cancelled are real,
// reachable states — both need a column or existing/received orders would
// simply vanish from the board.
const STATUS_COLUMNS = [
  { id: 'draft', label: 'Drafts', color: 'border-hairline-strong text-content-secondary bg-surface-2/40' },
  { id: 'submitted', label: 'Submitted', color: 'border-status-info/40 text-status-info bg-status-info/10' },
  { id: 'approved', label: 'Approved / In-Transit', color: 'border-status-warn/40 text-status-warn bg-status-warn/10' },
  { id: 'received', label: 'Received', color: 'border-status-good/40 text-status-good bg-status-good/10' },
  { id: 'cancelled', label: 'Cancelled', color: 'border-status-bad/40 text-status-bad bg-status-bad/10' },
];

// partially_received orders still need further receiving, so they belong
// alongside "approved" rather than in a column of their own or nowhere.
const columnForStatus = (status) => (status === 'partially_received' ? 'approved' : status);

const poTotalCost = (po) => (po.items || []).reduce((sum, item) => sum + item.unit_cost * item.quantity_ordered, 0);

export const PurchaseOrdersStudio = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [activeActionId, setActiveActionId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await poApi.listPurchaseOrders({ limit: 50 });
      setOrders(res.items || []);
      setIsOffline(false);
    } catch (e) {
      setOrders([]);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const grouped = useMemo(() => {
    const byColumn = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.id, []]));
    orders.forEach((po) => {
      const col = columnForStatus(po.status);
      if (byColumn[col]) byColumn[col].push(po);
    });
    return byColumn;
  }, [orders]);

  const handleAdvanceStatus = async (po) => {
    setActiveActionId(po.id);
    try {
      let updated;
      if (po.status === 'draft') {
        updated = await poApi.submitPurchaseOrder(po.id);
      } else if (po.status === 'submitted') {
        updated = await poApi.approvePurchaseOrder(po.id);
      } else if (po.status === 'approved' || po.status === 'partially_received') {
        // PurchaseOrderReceive expects { items: [{ product_id, quantity }] }
        // — receive whatever remains outstanding on every line item, not a
        // hardcoded product/quantity.
        const remaining = (po.items || [])
          .filter((item) => item.quantity_received < item.quantity_ordered)
          .map((item) => ({ product_id: item.product_id, quantity: item.quantity_ordered - item.quantity_received }));
        if (remaining.length === 0) {
          setActiveActionId(null);
          return;
        }
        updated = await poApi.receivePurchaseOrder(po.id, remaining);
      }
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === po.id ? updated : o)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-content-secondary" />
            <span>Purchase Order Board</span>
          </h2>
          <p className="text-xs text-content-muted">Track and advance procurement from draft to warehouse receipt</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOrders();
            }}
            className="p-1.5 rounded-lg bg-canvas/60 border border-hairline text-content-muted hover:text-content transition-colors duration-150"
            title="Refresh POs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-bad/30 bg-status-bad/10 text-status-bad text-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Could not reach the purchase orders API — showing no orders rather than a fabricated preview.</span>
        </div>
      )}

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {STATUS_COLUMNS.map((col) => {
          const colOrders = grouped[col.id] || [];
          return (
            <div
              key={col.id}
              className="p-3.5 rounded-2xl glass-card border border-hairline flex flex-col space-y-3 min-h-[420px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${col.color}`}>
                  {col.label} ({colOrders.length})
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {colOrders.map((po) => {
                  const total = poTotalCost(po);
                  const itemsCount = (po.items || []).length;
                  return (
                    <motion.div
                      key={po.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="p-3 rounded-xl bg-surface/80 border border-hairline hover:border-hairline-strong transition-colors duration-150 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-medium text-content">
                        <span className="font-mono text-[11px] text-content-secondary">{po.po_number || `PO #${po.id}`}</span>
                        <span className="font-mono text-content">${total.toFixed(2)}</span>
                      </div>

                      <div className="text-[11px] text-content-muted space-y-0.5">
                        <div>Supplier #{po.supplier_id}</div>
                        <div>Warehouse #{po.warehouse_id}</div>
                        <div>{itemsCount} line item{itemsCount === 1 ? '' : 's'}</div>
                      </div>

                      {(po.status === 'draft' || po.status === 'submitted' || po.status === 'approved' || po.status === 'partially_received') && (
                        <button
                          onClick={() => handleAdvanceStatus(po)}
                          disabled={activeActionId === po.id}
                          className="w-full mt-2 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-2 text-content hover:text-content border border-hairline-strong/80 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors duration-150 active:scale-95 disabled:opacity-50"
                        >
                          {po.status === 'draft' && <>Submit PO <Send className="w-3 h-3" /></>}
                          {po.status === 'submitted' && <>Approve <Check className="w-3 h-3" /></>}
                          {(po.status === 'approved' || po.status === 'partially_received') && <>Receive Stock <Truck className="w-3 h-3" /></>}
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {colOrders.length === 0 && (
                  <div className="text-center py-12 text-content-muted text-xs italic">
                    No orders in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
