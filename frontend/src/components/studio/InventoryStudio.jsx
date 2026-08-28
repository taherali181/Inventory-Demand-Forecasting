import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Search, ShieldAlert, Check, RefreshCw, WifiOff } from 'lucide-react';
import * as stockApi from '../../api/stock';
import * as productsApi from '../../api/products';
import * as warehousesApi from '../../api/warehouses';
const REASON_OPTIONS = [
  { value: 'cycle_count', label: 'Cycle count audit' },
  { value: 'damage_writeoff', label: 'Damaged inventory write-off' },
  { value: 'inbound_discrepancy', label: 'Inbound shipment discrepancy' },
  { value: 'internal_transfer', label: 'Internal transfer' },
];

export const InventoryStudio = () => {
  const [stockList, setStockList] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // { stockItem }
  const [adjustDelta, setAdjustDelta] = useState(10);
  const [adjustReason, setAdjustReason] = useState(REASON_OPTIONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const [stockRes, productsRes, warehousesRes] = await Promise.all([
        stockApi.listStock({ limit: 200 }),
        productsApi.listProducts(true, { limit: 200 }),
        warehousesApi.listWarehouses(true, { limit: 200 }),
      ]);
      setStockList(stockRes.items || []);
      setProducts(productsRes.items || []);
      setWarehouses(warehousesRes.items || []);
      setIsOffline(false);
    } catch (e) {
      setStockList([]);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;
    setIsSubmitting(true);

    try {
      // POST /stock/adjust returns the updated StockLevelRead — use that
      // authoritative row instead of guessing at the new totals locally.
      const updated = await stockApi.adjustStock({
        product_id: adjustModal.product_id,
        warehouse_id: adjustModal.warehouse_id,
        quantity_delta: parseInt(adjustDelta, 10),
        reference_type: adjustReason,
      });

      setStockList((prev) => {
        const idx = prev.findIndex(
          (item) => item.product_id === adjustModal.product_id && item.warehouse_id === adjustModal.warehouse_id
        );
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });

      setAdjustModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = stockList.filter((item) => {
    const productName = productMap[item.product_id]?.name || `Product #${item.product_id}`;
    const warehouseName = warehouseMap[item.warehouse_id]?.name || `WH #${item.warehouse_id}`;
    const term = searchTerm.toLowerCase();
    return productName.toLowerCase().includes(term) || warehouseName.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content flex items-center gap-2">
            <Boxes className="w-5 h-5 text-content-secondary" />
            <span>Master Inventory & Stock Levels</span>
          </h2>
          <p className="text-xs text-content-muted">Track and adjust on-hand inventory across all warehouses</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by product or warehouse…"
              className="pl-8 pr-3 py-1.5 rounded-lg glass-input text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-hairline-strong"
            />
          </div>

          <button
            onClick={() => {
              fetchStock();
            }}
            className="p-1.5 rounded-lg bg-canvas/60 border border-hairline text-content-muted hover:text-content transition-colors duration-150"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-bad/30 bg-status-bad/10 text-status-bad text-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Could not reach the stock API — showing no rows rather than a fabricated preview.</span>
        </div>
      )}

      {/* DataGrid Table */}
      <div className="glass-card rounded-2xl border border-hairline overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-canvas/60 text-content-muted border-b border-hairline uppercase tracking-wider text-[10px]">
              <th className="p-3.5 font-medium">Product</th>
              <th className="p-3.5 font-medium">Warehouse</th>
              <th className="p-3.5 font-medium text-right">On Hand</th>
              <th className="p-3.5 font-medium text-right">Available</th>
              <th className="p-3.5 font-medium text-center">Status</th>
              <th className="p-3.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60">
            {filtered.map((stock, idx) => {
              const product = productMap[stock.product_id];
              const reorderPoint = product?.reorder_point ?? 0;
              const isLow = (stock.quantity_available ?? 0) <= reorderPoint;
              return (
                <tr key={stock.id || idx} className="hover:bg-surface/40 transition-colors duration-150">
                  <td className="p-3.5 font-medium text-content-secondary">
                    <div className="font-medium text-content">{product?.name || `Product #${stock.product_id}`}</div>
                    <div className="text-[10px] text-content-muted font-mono">SKU-{product?.sku_code || stock.product_id}</div>
                  </td>
                  <td className="p-3.5 text-content-secondary">
                    {warehouseMap[stock.warehouse_id]?.name || `WH #${stock.warehouse_id}`}
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-content">
                    {stock.quantity_on_hand ?? 0}
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium">
                    <span className={isLow ? 'text-status-bad' : 'text-status-good'}>
                      {stock.quantity_available ?? 0}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-bad/10 text-status-bad border border-status-bad/30">
                        <ShieldAlert className="w-3 h-3" /> Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-good/10 text-status-good border border-status-good/30">
                        <Check className="w-3 h-3" /> Healthy
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => {
                        setAdjustModal(stock);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-2 text-content-secondary hover:text-content border border-hairline-strong/80 text-[11px] font-medium transition-colors duration-150 active:scale-95"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-content-muted text-xs">
                  No stock rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive Stock Adjust Modal */}
      <AnimatePresence>
        {adjustModal && (
          <div className="fixed inset-0 bg-canvas/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-semibold text-content flex items-center gap-2">
                <Boxes className="w-5 h-5 text-content-secondary" />
                <span>Adjust Stock Level</span>
              </h3>
              <p className="text-xs text-content-muted">
                Product:{' '}
                <strong className="text-content">
                  {productMap[adjustModal.product_id]?.name || `Product #${adjustModal.product_id}`}
                </strong>{' '}
                at {warehouseMap[adjustModal.warehouse_id]?.name || `Warehouse #${adjustModal.warehouse_id}`}
              </p>

              <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-content-muted font-medium mb-1 block">Quantity Delta (+ or -)</label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg glass-input text-content font-mono text-sm focus:outline-none focus:border-hairline-strong"
                  />
                </div>

                <div>
                  <label className="text-content-muted font-medium mb-1 block">Reason</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-content focus:outline-none focus:border-hairline-strong"
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => setAdjustModal(null)}
                    className="px-3 py-1.5 rounded-lg text-content-secondary hover:text-content text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold transition-colors duration-150 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating…' : 'Confirm Stock Delta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
