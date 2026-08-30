import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { UserRead } from '../../api/types';

/**
 * ShellContext — Layer 1 shell state. `useReducer`-backed, no Redux/Zustand (design brief, "Stack
 * decisions").
 *
 * This file is a SCAFFOLD (per this package's task): it defines the state shape, the action types the
 * reducer needs, and the global `⌘K`/`Ctrl+K` + `Escape` keydown listener. It deliberately does NOT define
 * the deterministic quick-prompt → canned-reply → canvas-action mapping — that scripted-response table is
 * a later package's job. Callers dispatch `SEND_MESSAGE`/`OPEN_CANVAS` themselves with whatever content
 * that later package decides on.
 */

/* ------------------------------------------------------------------------------------------------ */
/* Message shape — sufficient for Layer 2 (chat surface) to render on top of.                         */
/* ------------------------------------------------------------------------------------------------ */

export type MessageRole = 'user' | 'assistant';

/**
 * An optional widget/card attached to an assistant message (e.g. the KPI stat grid on the very first
 * message, or a ConfirmActionCard offering to draft a PO). `type` is a free-form discriminator — the
 * concrete set of types and their `data` shapes belongs to whichever package builds the chat surface and
 * the scripted-response table; this scaffold only guarantees an attachment can ride along with a message.
 */
export interface MessageAttachment {
  type: string;
  data?: unknown;
}

export interface Message {
  id: string;
  role: MessageRole;
  /**
   * ReactNode, not `string` — Layer 2's `AssistantMessage.text` is itself typed `ReactNode` specifically
   * so scripted copy can round-trip inline emphasis (e.g. `<strong>Acme Corp</strong>`, per the mockups'
   * own bolded supplier names). Widened here to match rather than forcing Layer 4's scripted-response
   * table to flatten that back to plain strings.
   */
  text: ReactNode;
  /** Pre-formatted display string (e.g. "09:04"), matching the mockups' own plain-text timestamps. */
  timestamp: string;
  attachment?: MessageAttachment;
}

/* ------------------------------------------------------------------------------------------------ */
/* Canvas state — the docked widgets panel (ChatWithCanvas) or the escalated Kanban board (POKanban).  */
/* ------------------------------------------------------------------------------------------------ */

export type CanvasTab = 'alerts' | 'reorder' | 'forecast';

export type CanvasState = null | { mode: 'widgets' | 'kanban'; tab?: CanvasTab };

/* ------------------------------------------------------------------------------------------------ */
/* Shell state + actions                                                                              */
/* ------------------------------------------------------------------------------------------------ */

export interface ShellState {
  isAuthenticated: boolean;
  /** The real logged-in user (`GET /auth/me`) — null while logged out. */
  user: UserRead | null;
  messages: Message[];
  canvas: CanvasState;
  commandPaletteOpen: boolean;
  mobileSheetOpen: boolean;
}

export const initialShellState: ShellState = {
  isAuthenticated: false,
  user: null,
  messages: [],
  canvas: null,
  commandPaletteOpen: false,
  mobileSheetOpen: false,
};

export type ShellAction =
  | { type: 'SEND_MESSAGE'; message: Message }
  | { type: 'OPEN_CANVAS'; canvas: NonNullable<CanvasState> }
  | { type: 'CLOSE_CANVAS' }
  | { type: 'SET_CANVAS_TAB'; tab: CanvasTab }
  | { type: 'TOGGLE_PALETTE' }
  | { type: 'SET_PALETTE'; open: boolean }
  | { type: 'SET_MOBILE_SHEET'; open: boolean }
  | { type: 'LOGIN'; user: UserRead }
  | { type: 'LOGOUT' };

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case 'SEND_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'OPEN_CANVAS':
      return { ...state, canvas: action.canvas };
    case 'CLOSE_CANVAS':
      return { ...state, canvas: null };
    case 'SET_CANVAS_TAB':
      return state.canvas ? { ...state, canvas: { ...state.canvas, tab: action.tab } } : state;
    case 'TOGGLE_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    case 'SET_PALETTE':
      return { ...state, commandPaletteOpen: action.open };
    case 'SET_MOBILE_SHEET':
      return { ...state, mobileSheetOpen: action.open };
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.user };
    case 'LOGOUT':
      // A fresh, logged-out session has no conversation and no open canvas — matches Login.dc.html's
      // "empty-chat-home" as the post-login landing state.
      return { ...initialShellState, isAuthenticated: false };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Provider + hook                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

export interface ShellContextValue {
  state: ShellState;
  dispatch: Dispatch<ShellAction>;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export interface ShellProviderProps {
  children: ReactNode;
  /** Overrides for the initial state — e.g. a preview harness starting already authenticated. */
  initialState?: Partial<ShellState>;
}

export function ShellProvider({ children, initialState }: ShellProviderProps) {
  const [state, dispatch] = useReducer(shellReducer, {
    ...initialShellState,
    ...initialState,
  });

  // Mounted ONCE (empty dep array below) per the design brief. A ref keeps the listener's closure seeing
  // fresh state (for the Escape branch, which needs to know what's currently open) without re-registering
  // the DOM listener on every state change.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isPaletteShortcut) {
        event.preventDefault();
        dispatch({ type: 'TOGGLE_PALETTE' });
        return;
      }

      if (event.key === 'Escape') {
        const current = stateRef.current;
        if (current.commandPaletteOpen) {
          dispatch({ type: 'SET_PALETTE', open: false });
        } else if (current.mobileSheetOpen) {
          dispatch({ type: 'SET_MOBILE_SHEET', open: false });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell() must be called within a <ShellProvider>.');
  }
  return ctx;
}

/**
 * Convenience accessor for callers that only need `dispatch` (e.g. a leaf component wiring a single
 * button) without destructuring the full `useShell()` value each time.
 */
export function useShellDispatch(): Dispatch<ShellAction> {
  return useShell().dispatch;
}
