import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  TrendingUp,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  BarChart3,
  X,
  LogOut
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../context/AuthContext';
const QUICK_ACTIONS = [
  { id: 'forecast', title: 'Demand forecast', category: 'Planning', icon: TrendingUp, action: 'forecast' },
  { id: 'inventory', title: 'Inventory and stock levels', category: 'Operations', icon: Boxes, action: 'inventory' },
  { id: 'purchase-orders', title: 'Purchase orders', category: 'Procurement', icon: ShoppingCart, action: 'purchase-orders' },
  { id: 'alerts', title: 'Low-stock alerts', category: 'Monitoring', icon: ShieldAlert, action: 'alerts' },
  { id: 'eda', title: 'Sales analysis', category: 'Data', icon: BarChart3, action: 'eda' },
  { id: 'dashboard', title: 'Dashboard', category: 'Overview', icon: LayoutDashboard, action: 'dashboard' },
];

export const CommandPalette = () => {
  const { isCmdKOpen, setCmdKOpen, setActiveStudioView } = useAppStore();
  const { logout, user } = useAuth();
  const [search, setSearch] = useState('');

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(!isCmdKOpen);
      }
      if (e.key === 'Escape' && isCmdKOpen) {
        setCmdKOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdKOpen, setCmdKOpen]);

  const handleSelect = (item) => {
    setActiveStudioView(item.action);
    setCmdKOpen(false);
  };

  const filtered = QUICK_ACTIONS.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isCmdKOpen && (
        <div className="fixed inset-0 bg-canvas backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden glass-panel"
          >
            {/* Search Input Bar */}
            <div className="p-3.5 border-b border-hairline flex items-center gap-3">
              <Search className="w-4 h-4 text-content-muted shrink-0" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or jump to..."
                className="w-full bg-transparent text-sm text-content placeholder:text-content-muted focus:outline-none"
              />
              <button
                onClick={() => setCmdKOpen(false)}
                className="p-1 rounded-lg text-content-secondary hover:text-content transition-colors duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Command Results */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                Go to
              </div>

              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-surface-2 text-xs flex items-center justify-between group transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-surface-2 text-content-secondary group-hover:bg-surface-2 group-hover:text-content transition-colors duration-150">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-content group-hover:text-content">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-content-muted">{item.category}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-content-muted font-mono">Jump →</span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 bg-canvas border-t border-hairline flex items-center justify-between text-[11px] text-content-secondary">
              <div className="flex items-center gap-2">
                <span>Navigate <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-hairline text-[10px] text-content-secondary font-mono">↑↓</kbd></span>
                <span>Select <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-hairline text-[10px] text-content-secondary font-mono">↵</kbd></span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Close{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-hairline text-[10px] text-content-secondary font-mono">
                    esc
                  </kbd>
                </span>
                {user && (
                  <button
                    onClick={logout}
                    className="hover:text-status-bad flex items-center gap-1 transition-colors duration-150"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
