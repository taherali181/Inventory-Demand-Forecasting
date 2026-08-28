import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickPromptChips } from './QuickPromptChips';
import { useAppStore } from '../../store/useAppStore';
import { AgentEngine } from '../../ai/agentEngine';

export const ChatContainer = () => {
  const {
    messages,
    addMessage,
    clearChat,
    isThinking,
    setIsThinking,
    splitMode,
    setSplitMode
  } = useAppStore();

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // 1. Add User Message to thread
    addMessage({
      sender: 'user',
      text: text
    });

    setIsThinking(true);

    try {
      // 2. Process query via RAG Agent Engine
      const aiResponse = await AgentEngine.processQuery(text);

      // 3. Add AI Response with Widgets
      addMessage({
        sender: 'ai',
        text: aiResponse.text,
        widgets: aiResponse.widgets || [],
        quickActions: aiResponse.quickActions || []
      });
    } catch (err) {
      console.error(err);
      addMessage({
        sender: 'ai',
        text: `Something went wrong processing your request: ${err.message}`
      });
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas relative">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-hairline/[0.06] flex items-center justify-between glass-panel z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-content ring-1 ring-hairline/10">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium text-content flex items-center gap-2">
              <span>Ask</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-status-good/10 text-status-good border border-status-good/25">
                <span className="w-1.5 h-1.5 rounded-full bg-status-good" />
                Live
              </span>
            </div>
            <div className="text-[11px] text-content-muted">Inventory intelligence assistant</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 rounded-md text-content-muted hover:text-status-bad hover:bg-surface-2/60 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSplitMode(splitMode === 'chat-only' ? 'split' : 'chat-only')}
            className="p-2 rounded-md text-content-muted hover:text-content hover:bg-surface-2/60 transition-colors hidden md:inline-flex"
            title={splitMode === 'chat-only' ? "Open Split Studio" : "Full Chat View"}
          >
            {splitMode === 'chat-only' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onQuickAction={handleSendMessage}
            />
          ))}
        </AnimatePresence>

        {/* Thinking Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5 p-3 rounded-xl glass-card border border-hairline/[0.08] w-fit max-w-[180px]"
          >
            <div className="w-5 h-5 rounded-md bg-surface-2 text-content-secondary flex items-center justify-center animate-spin">
              <MessageSquare className="w-3 h-3" />
            </div>
            <span className="text-xs text-content-secondary">Thinking&hellip;</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Prompt Suggestions Dock */}
      <div className="p-4 pt-2 border-t border-hairline/[0.06] bg-canvas/90 backdrop-blur-xl">
        <QuickPromptChips onSelectPrompt={handleSendMessage} />
        <div className="mt-2">
          <ChatInput onSendMessage={handleSendMessage} isThinking={isThinking} />
        </div>
      </div>
    </div>
  );
};
