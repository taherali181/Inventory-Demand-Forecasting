import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChatContainer } from './chat/ChatContainer';
import { StudioContainer } from './studio/StudioContainer';
import { useAppStore } from '../store/useAppStore';

/*
 * Which studio each deep-link opens.
 *
 * This mapping did not exist before, so every one of these paths rendered
 * whatever `activeStudioView` happened to be — in practice always the default
 * dashboard. /forecast showed the dashboard; the URL and the visible studio
 * were simply unrelated.
 */
const PATH_TO_STUDIO = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/forecast': 'forecast',
  '/inventory': 'inventory',
  '/purchase-orders': 'purchase-orders',
  '/alerts': 'alerts',
  '/eda': 'eda',
};

/**
 * The chat-first split canvas. Rendered inside AppShell, which owns the
 * sidebar, the topbar and the command palette — this component is now only the
 * two panes.
 */
export const MainLayout = () => {
  const splitMode = useAppStore((s) => s.splitMode);
  const activeStudioView = useAppStore((s) => s.activeStudioView);
  const setActiveStudioView = useAppStore((s) => s.setActiveStudioView);
  const { pathname } = useLocation();

  // URL -> store, one direction only. A reverse store -> URL effect would fight
  // this one: each would observe the other's write and schedule another update.
  // The `!==` guard makes a no-op path change cost nothing.
  useEffect(() => {
    const view = PATH_TO_STUDIO[pathname];
    if (view && view !== activeStudioView) {
      setActiveStudioView(view);
    }
  }, [pathname, activeStudioView, setActiveStudioView]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas font-sans text-content">
      {/* `flex-1 min-h-0` rather than a viewport-minus-3.5rem calc height —
          the calc hard-coded the header height, so it drifted the moment the
          header changed and left a gap or an overflow. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Conversational copilot */}
        {(splitMode === 'split' || splitMode === 'chat-only') && (
          <motion.div
            layout
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`h-full overflow-hidden ${
              splitMode === 'chat-only'
                ? 'mx-auto w-full max-w-5xl'
                : 'w-full shrink-0 lg:w-[45%] xl:w-[40%]'
            }`}
          >
            <ChatContainer />
          </motion.div>
        )}

        {/* Interactive context studio */}
        {(splitMode === 'split' || splitMode === 'studio-only') && (
          <motion.div
            layout
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`h-full overflow-hidden ${
              splitMode === 'studio-only' ? 'w-full' : 'w-full flex-1 lg:w-[55%] xl:w-[60%]'
            }`}
          >
            <StudioContainer />
          </motion.div>
        )}
      </div>
    </div>
  );
};
