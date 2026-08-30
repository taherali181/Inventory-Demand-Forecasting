import { ChatInputDock, QuickPromptChips } from '../components/chat';
import { CanvasWidgetsPanel } from '../components/canvas/widgets';
import { POKanbanPanel } from '../components/canvas/kanban';
import { IconRail, TopHeader, useShell } from '../components/shell';
import type { Message } from '../components/shell';
import { MessageLog } from './MessageLog';
import { QUICK_PROMPTS, resolveScriptedResponse } from '../lib/scriptedResponses';
import { formatTimestamp } from '../lib/timestamp';
import { useCanvasWidgetsData } from '../hooks/useCanvasWidgetsData';
import { usePOKanbanData } from '../hooks/usePOKanbanData';
import { logout as apiLogout } from '../api/auth';
import { clearLookupCaches } from '../api/lookups';
import { avatarInitials } from '../lib/userDisplay';

/**
 * DesktopShell — Layer 4. Composes the icon rail + main content area for the three desktop screen states
 * that share one shell (design brief: states, not routes):
 *
 *   canvas === null           → empty-chat-home: wide (720px-centered) chat column, quick prompts + home
 *                                input dock. Main.dc.html.
 *   canvas.mode === 'widgets' → chat-with-canvas-open: narrow (600px) chat column + docked
 *                                CanvasWidgetsPanel. ChatWithCanvas.dc.html.
 *   canvas.mode === 'kanban'  → PO-Kanban-expanded: chat column disappears entirely (verified against
 *                                POKanban.dc.html — there is no chat column in that source file at all,
 *                                the panel takes the full remaining width next to the icon rail).
 *
 * WORKSPACE_LABEL ("Acme Warehousing") is the one piece of copy every desktop mockup hardcodes identically
 * — kept as a local constant rather than plumbed through as a prop nobody would ever vary in this preview.
 *
 * CanvasWidgetsPanel and POKanbanPanel are fed real backend data (`useCanvasWidgetsData`/
 * `usePOKanbanData`) instead of the mockup's `sampleData.ts` — see those hooks' header comments for how
 * each field is derived. Only fetched while the corresponding canvas mode is actually mounted.
 */
const WORKSPACE_LABEL = 'Acme Warehousing';

export function DesktopShell() {
  const { state, dispatch } = useShell();
  const { canvas, messages, user } = state;

  function appendMessages(userText: string) {
    const scripted = resolveScriptedResponse(userText);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: formatTimestamp(),
    };
    const assistantMessage: Message = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      text: scripted.reply,
      timestamp: formatTimestamp(),
      attachment: scripted.attachment,
    };
    dispatch({ type: 'SEND_MESSAGE', message: userMessage });
    dispatch({ type: 'SEND_MESSAGE', message: assistantMessage });
    dispatch({ type: 'OPEN_CANVAS', canvas: scripted.canvas });
  }

  async function handleLogout() {
    try {
      await apiLogout();
    } finally {
      clearLookupCaches();
      dispatch({ type: 'LOGOUT' });
    }
  }

  return (
    <div className="hud-bg flex" style={{ width: '100%', height: '100%', minHeight: '100vh' }}>
      <IconRail
        activeIcon={canvas?.mode === 'kanban' ? 'none' : 'history'}
        avatarInitials={avatarInitials(user)}
        onAvatarClick={() => void handleLogout()}
      />

      {canvas?.mode === 'kanban' ? (
        <KanbanView
          onBackToChat={() => dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'widgets', tab: 'reorder' } })}
        />
      ) : canvas?.mode === 'widgets' ? (
        <>
          <NarrowChatColumn messages={messages} onSend={appendMessages} />
          <WidgetsCanvasView
            activeTab={canvas.tab ?? 'alerts'}
            onTabChange={(tab) => dispatch({ type: 'SET_CANVAS_TAB', tab })}
            onExpand={() => dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'kanban' } })}
            onClose={() => dispatch({ type: 'CLOSE_CANVAS' })}
            onCreatePo={() => dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'kanban' } })}
          />
        </>
      ) : (
        <WideChatHome messages={messages} onSend={appendMessages} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* chat-with-canvas-open's docked panel, wired to real data                                          */
/* ---------------------------------------------------------------------------------------------- */

function WidgetsCanvasView({
  activeTab,
  onTabChange,
  onExpand,
  onClose,
  onCreatePo,
}: {
  activeTab: 'alerts' | 'reorder' | 'forecast';
  onTabChange: (tab: 'alerts' | 'reorder' | 'forecast') => void;
  onExpand: () => void;
  onClose: () => void;
  onCreatePo: () => void;
}) {
  const data = useCanvasWidgetsData();

  return (
    <CanvasWidgetsPanel
      activeTab={activeTab}
      onTabChange={onTabChange}
      onExpand={onExpand}
      onClose={onClose}
      alerts={data.alerts}
      reorder={data.reorder ? { ...data.reorder, onCtaClick: onCreatePo } : null}
      forecast={data.forecast}
      forecastLabel={data.forecastLabel}
    />
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* PO-Kanban-expanded, wired to real data                                                           */
/* ---------------------------------------------------------------------------------------------- */

function KanbanView({ onBackToChat }: { onBackToChat: () => void }) {
  const data = usePOKanbanData();
  return <POKanbanPanel onBackToChat={onBackToChat} columns={data.columns} />;
}

/* ---------------------------------------------------------------------------------------------- */
/* empty-chat-home — Main.dc.html                                                                    */
/* ---------------------------------------------------------------------------------------------- */

function WideChatHome({ messages, onSend }: { messages: Message[]; onSend: (text: string) => void }) {
  const { dispatch } = useShell();
  const conversationStarted = messages.some((m) => m.role === 'user');
  const openKanban = () => dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'kanban' } });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TopHeader
        variant="app"
        workspaceLabel={WORKSPACE_LABEL}
        onPaletteOpen={() => dispatch({ type: 'TOGGLE_PALETTE' })}
      />

      <div className="flex flex-1 justify-center overflow-auto">
        <div style={{ width: 720, padding: '64px 24px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <MessageLog
            messages={messages}
            assistantSize="hero"
            messageGap={28}
            onConfirmPrimary={openKanban}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center" style={{ padding: '0 24px 28px' }}>
        {!conversationStarted && <QuickPromptChips prompts={[...QUICK_PROMPTS]} onSelect={onSend} />}
        <ChatInputDock
          variant="home"
          placeholder="Ask about stock, forecasts, suppliers, or orders…"
          caption="Restock can query and act on your inventory data — it always asks before making a change."
          onSubmit={onSend}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* chat-with-canvas-open's left column — ChatWithCanvas.dc.html                                      */
/* ---------------------------------------------------------------------------------------------- */

function NarrowChatColumn({ messages, onSend }: { messages: Message[]; onSend: (text: string) => void }) {
  const { dispatch } = useShell();

  return (
    <div className="flex min-w-0 shrink-0 flex-col border-r border-hairline" style={{ width: 600 }}>
      <TopHeader variant="chatColumn" workspaceLabel={WORKSPACE_LABEL} />

      <div className="flex-1 overflow-auto" style={{ padding: '24px 20px' }}>
        <MessageLog
          messages={messages}
          assistantSize="body"
          messageGap={22}
          assistantInnerGap={14}
          onConfirmPrimary={() => dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'kanban' } })}
        />
      </div>

      <ChatInputDock variant="followup" placeholder="Ask a follow-up…" onSubmit={onSend} />
    </div>
  );
}
