import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  BarChart3,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
const STUDIO_TABS = [
  { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard },
  { id: 'forecast', label: 'Forecast Sandbox', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory Grid', icon: Boxes },
  { id: 'purchase-orders', label: 'PO Kanban', icon: ShoppingCart },
  { id: 'alerts', label: 'Alerts Triage', icon: ShieldAlert },
  { id: 'eda', label: 'EDA Studio', icon: BarChart3 },
];

export const StudioHeader = () => {
  const { activeStudioView, setActiveStudioView, splitMode, setSplitMode } = useAppStore();

  return (
    <div className="px-4 py-2.5 border-b border-hairline bg-canvas/90 backdrop-blur-xl flex items-center justify-between gap-2 overflow-x-auto">
      {/* Studio View Selector Tabs */}
      <div className="flex items-center gap-1.5 no-scrollbar">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStudioView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveStudioView(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? 'bg-surface-2 text-content border border-hairline-strong shadow-sm'
                  : 'text-content-muted border border-transparent hover:text-content hover:bg-surface/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Canvas View Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            setSplitMode(splitMode === 'studio-only' ? 'split' : 'studio-only');
          }}
          className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface/70 transition-colors duration-150"
          title={splitMode === 'studio-only' ? "Restore Split View" : "Maximize Studio"}
        >
          {splitMode === 'studio-only' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            setSplitMode('chat-only');
          }}
          className="p-1.5 rounded-lg text-content-muted hover:text-status-bad hover:bg-surface/70 transition-colors duration-150"
          title="Close Studio Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
