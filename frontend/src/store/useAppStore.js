import { create } from 'zustand';

const QUICK_ACTIONS = [
  { label: 'Low stock alerts', query: '/alerts' },
  { label: 'Reorder suggestions', query: '/reorder' },
  { label: 'Demand forecast', query: '/forecast' },
  { label: 'Sales analysis', query: '/eda' },
];

export const useAppStore = create((set, get) => ({
  // Navigation & Layout
  activeStudioView: 'dashboard', // 'dashboard' | 'forecast' | 'inventory' | 'purchase-orders' | 'alerts' | 'eda' | 'audit'
  splitMode: 'split', // 'split' | 'chat-only' | 'studio-only'
  isCmdKOpen: false,
  unreadAlertsCount: 0,
  selectedEntity: null, // { type: 'product' | 'po' | 'forecast', id: ..., data: ... }

  // Chat State
  messages: [
    {
      id: 'welcome-msg',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      text: "**Restock** — a fast way to query your inventory.\n\nAsk about stock levels, demand forecasts, reorder points, or purchase orders. Slash commands go straight to the data: `/alerts`, `/reorder`, `/forecast`, `/po`, `/stock`, `/kpi`, `/eda`.",
      widgets: [
        {
          type: 'kpi-summary',
          data: { periodDays: 30 }
        }
      ],
      quickActions: [...QUICK_ACTIONS],
    }
  ],
  isThinking: false,

  // Actions
  setActiveStudioView: (view, entity = null) => {
    set({
      activeStudioView: view,
      selectedEntity: entity,
      // A deep link into a studio should reveal it if the canvas is chat-only.
      splitMode: get().splitMode === 'chat-only' ? 'split' : get().splitMode
    });
  },

  setSplitMode: (mode) => {
    set({ splitMode: mode });
  },

  setCmdKOpen: (isOpen) => {
    set({ isCmdKOpen: isOpen });
  },

  setUnreadAlertsCount: (count) => {
    set({ unreadAlertsCount: count });
  },

  addMessage: (msg) => {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...msg,
    };
    set((state) => ({
      messages: [...state.messages, newMsg]
    }));
    return newMsg.id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m))
    }));
  },

  setIsThinking: (isThinking) => {
    set({ isThinking });
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          text: "Conversation cleared. Ask about stock levels, forecasts, reorder points, or purchase orders — or start with a command like `/alerts`.",
          quickActions: QUICK_ACTIONS.slice(0, 3),
        }
      ]
    });
  }
}));
