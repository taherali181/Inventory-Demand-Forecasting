import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Terminal } from 'lucide-react';
const SLASH_COMMANDS = [
  { cmd: '/alerts', desc: 'Scan and display active low-stock risk radar' },
  { cmd: '/reorder', desc: 'AI-calculated replenishment recommendations' },
  { cmd: '/forecast', desc: 'Simulate ML demand forecast comparisons' },
  { cmd: '/po', desc: 'Review purchase order lifecycles and statuses' },
  { cmd: '/stock', desc: 'Query real-time stock levels across warehouses' },
  { cmd: '/kpi', desc: 'Executive 30-day KPI performance metrics' },
  { cmd: '/eda', desc: 'Sales exploratory data analysis and distributions' },
];

export const ChatInput = ({ onSendMessage, isThinking }) => {
  const [text, setText] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (text.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(text.slice(1).toLowerCase());
    } else {
      setShowSlashMenu(false);
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isThinking) return;
    onSendMessage(text);
    setText('');
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSlash = (cmd) => {
    setText(`${cmd} `);
    setShowSlashMenu(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const toggleVoice = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate quick voice transcription prompt
      setTimeout(() => {
        setText('What products are currently below reorder threshold?');
        setIsRecording(false);
      }, 1800);
    }
  };

  const filteredCommands = SLASH_COMMANDS.filter((item) =>
    item.cmd.slice(1).includes(slashFilter)
  );

  return (
    <div className="relative w-full">
      {/* Slash Command Autocomplete Popover */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-surface/95 backdrop-blur-xl border border-hairline/[0.08] rounded-lg shadow-2xl p-1.5 z-50">
          <div className="px-3 py-1.5 text-[10px] font-medium text-content-muted uppercase tracking-wide flex items-center justify-between border-b border-hairline/[0.06]">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-content-muted" />
              Quick Commands
            </span>
            <span>Click to use</span>
          </div>
          <div className="max-h-48 overflow-y-auto mt-1 space-y-0.5">
            {filteredCommands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => handleSelectSlash(item.cmd)}
                className="w-full px-3 py-2 text-left rounded-md hover:bg-surface-2/[0.05] text-xs flex items-center justify-between group transition-colors"
              >
                <span className="font-mono font-medium text-content-secondary group-hover:text-content">
                  {item.cmd}
                </span>
                <span className="text-content-muted text-[11px] truncate max-w-[60%]">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Glass Input Bar */}
      <div className="glass-panel p-2 rounded-xl border border-hairline/[0.08] relative flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about stock, forecasts or orders — or type / for commands"
          rows={1}
          className="w-full bg-transparent text-content placeholder:text-content-muted text-sm focus:outline-none resize-none px-3 py-1.5 max-h-32"
        />

        <div className="flex items-center justify-between pt-1 px-1 border-t border-hairline/[0.06]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectSlash('/')}
              className="p-1.5 rounded-md text-content-muted hover:text-content hover:bg-surface-2/[0.05] transition-colors"
              title="Slash commands"
            >
              <Terminal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleVoice}
              className={`p-1.5 rounded-md transition-colors ${
                isRecording
                  ? 'bg-status-bad/10 text-status-bad'
                  : 'text-content-muted hover:text-content hover:bg-surface-2/[0.05]'
              }`}
              title="Voice dictation"
            >
              <Mic className="w-4 h-4" />
            </button>

            {isRecording && (
              <span className="text-[11px] text-status-bad font-medium">
                Listening&hellip;
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-content-muted hidden sm:inline">
              Return to send &middot; Shift+Return for newline
            </span>
            <button
              onClick={handleSend}
              disabled={!text.trim() || isThinking}
              className="px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-fg text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
