import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import { WidgetRenderer } from './widgets/WidgetRenderer';
export const ChatMessage = ({ message, onQuickAction }) => {
  const isAi = message.sender === 'ai';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert simple markdown bold and code ticks into JSX
  const formatText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // replace **bold** and `code`
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      return (
        <p key={lIdx} className={lIdx > 0 ? 'mt-2' : ''}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-content">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={pIdx} className="px-1.5 py-0.5 rounded bg-surface-2 text-content-secondary font-mono text-[11px]">{part.slice(1, -1)}</code>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex gap-3 mb-4 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        isAi
          ? 'bg-surface-2 text-content-secondary ring-1 ring-hairline/10'
          : 'bg-accent text-accent-fg ring-1 ring-hairline/10'
      }`}>
        {isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
      </div>

      {/* Message Bubble Container */}
      <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
        <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed relative group ${
          isAi
            ? 'glass-card border border-hairline/[0.08] text-content rounded-tl-sm'
            : 'bg-accent text-accent-fg rounded-tr-sm'
        }`}>
          {formatText(message.text)}

          {/* Render Any Generative UI Widgets */}
          {message.widgets && message.widgets.length > 0 && (
            <div className="w-full">
              {message.widgets.map((widget, idx) => (
                <WidgetRenderer key={idx} widget={widget} />
              ))}
            </div>
          )}

          {/* Quick Copy / Action floating tool */}
          {isAi && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-surface/80 hover:bg-surface-2 text-content-muted hover:text-content-secondary opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-status-good" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Quick Action Suggested Chips */}
        {isAi && message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onQuickAction && onQuickAction(action.query)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface/80 hover:bg-surface-2 text-content-secondary hover:text-content border border-hairline/[0.08] hover:border-hairline/[0.16] transition-colors active:scale-[0.97]"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] text-content-muted mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};
