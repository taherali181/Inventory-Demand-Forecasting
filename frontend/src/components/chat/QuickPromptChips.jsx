import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ShoppingBag, FileSpreadsheet } from 'lucide-react';
const DEFAULT_PROMPTS = [
  { icon: AlertTriangle, label: "Low stock risks", query: "/alerts" },
  { icon: ShoppingBag, label: "Reorder suggestions", query: "/reorder" },
  { icon: TrendingUp, label: "Forecast models", query: "/forecast" },
  { icon: FileSpreadsheet, label: "Sales EDA", query: "/eda" },
];

export const QuickPromptChips = ({ onSelectPrompt }) => {
  const handleClick = (query) => {
    onSelectPrompt(query);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
      <div className="text-[10px] font-medium text-content-muted uppercase tracking-wide shrink-0 pl-1">
        Quick starts
      </div>
      {DEFAULT_PROMPTS.map((p, idx) => {
        const Icon = p.icon;
        return (
          <motion.button
            key={idx}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleClick(p.query)}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-surface/60 border border-hairline/[0.08] hover:border-hairline/[0.16] text-content-secondary hover:text-content flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Icon className="w-3.5 h-3.5 text-content-muted" />
            <span>{p.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
