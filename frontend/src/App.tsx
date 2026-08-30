import { useEffect, useRef, useState } from 'react';
import { APP_ROOT_DIM_FILTER } from './components/palette';
import { ShellProvider, useShell } from './components/shell';
import { useIsMobile } from './hooks/useIsMobile';
import { useDashboardKpiStats } from './hooks/useDashboardKpiStats';
import { formatTimestamp } from './lib/timestamp';
import { getCurrentUser } from './api/auth';
import { getAccessToken, clearTokens, setSessionExpiredHandler } from './api/client';
import { LoginScreen } from './screens/LoginScreen';
import { DesktopShell } from './screens/DesktopShell';
import { MobileShell } from './screens/MobileShell';
import { CommandPaletteRoot } from './screens/CommandPaletteRoot';

/**
 * App — Layer 4 root. Composes the six mockup screens as states of ONE `ShellProvider`-backed shell
 * (design brief: no `react-router`, no separate routes):
 *
 *   Login                  → !state.isAuthenticated
 *   empty-chat-home        → authenticated, canvas === null              (DesktopShell)
 *   chat-with-canvas-open  → authenticated, canvas.mode === 'widgets'    (DesktopShell)
 *   PO-Kanban-expanded     → authenticated, canvas.mode === 'kanban'     (DesktopShell)
 *   mobile                 → authenticated, viewport ≤ ~768px            (MobileShell, replaces DesktopShell
 *                             entirely rather than gradually resizing it — design brief, Layer 4)
 *   command-palette-open   → state.commandPaletteOpen, an overlay on top of whichever of the above is
 *                             showing underneath (dimmed via `APP_ROOT_DIM_FILTER` on the real app root,
 *                             not a duplicated DOM copy — PaletteOverlay's own header comment)
 *
 * The global ⌘K/Escape listener already lives in `ShellProvider` (Layer 1) — this file only reacts to the
 * state it produces.
 */
function App() {
  return (
    <ShellProvider>
      <RootShell />
    </ShellProvider>
  );
}

function RootShell() {
  const { state, dispatch } = useShell();
  const isMobile = useIsMobile();
  const kpiStats = useDashboardKpiStats();
  // Guards against React 19 StrictMode's dev-only double effect invocation on mount, which would
  // otherwise dispatch this seed message twice before the first dispatch's re-render lands (the
  // `messages.length === 0` check alone isn't enough — both invocations can see the same pre-dispatch
  // state). A ref survives across that double-invoke without waiting for a re-render.
  const hasSeededGreeting = useRef(false);
  // Resolves an existing localStorage token (if any) to a real user before deciding whether to show
  // Login or the shell — mirrors the old AuthContext's "GET /auth/me on mount with an existing token"
  // pattern (root CLAUDE.md's Frontend section) for the *behavior*, not the (deleted) code.
  const [authResolving, setAuthResolving] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => dispatch({ type: 'LOGOUT' }));
  }, [dispatch]);

  useEffect(() => {
    if (!getAccessToken()) {
      setAuthResolving(false);
      return;
    }
    getCurrentUser()
      .then((user) => dispatch({ type: 'LOGIN', user }))
      .catch(() => clearTokens())
      .finally(() => setAuthResolving(false));
    // Runs once on mount only — a token found later (e.g. after LoginScreen's own login call) is resolved
    // by that call site directly, not by this effect re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the very first assistant message (the KPI-grid greeting, Main.dc.html) once, right after login —
  // ShellContext's LOGIN action deliberately only flips `isAuthenticated`; composing the initial
  // conversation content is this layer's job, not the shell's. Held until the real KPI fetch
  // (`useDashboardKpiStats`) finishes so the grid seeds with real numbers (or an honest "—") rather than
  // needing a follow-up update once they arrive.
  useEffect(() => {
    if (!state.isAuthenticated) {
      // Allows the greeting to be seeded again after a LOGOUT (which clears messages) → LOGIN round trip.
      hasSeededGreeting.current = false;
      return;
    }
    if (state.messages.length === 0 && !hasSeededGreeting.current && !kpiStats.loading) {
      hasSeededGreeting.current = true;
      dispatch({
        type: 'SEND_MESSAGE',
        message: {
          id: 'assistant-greeting',
          role: 'assistant',
          text: "Morning — here's where things stand.",
          timestamp: formatTimestamp(),
          attachment: { type: 'kpi-grid', data: { stats: kpiStats.stats } },
        },
      });
    }
  }, [state.isAuthenticated, state.messages.length, kpiStats.loading, kpiStats.stats, dispatch]);

  if (authResolving) {
    // Brief, unstyled beat while a stored token is verified — shorter than any meaningful loading UI
    // would be visible for, and avoids flashing the Login screen for an already-logged-in user.
    return null;
  }

  return (
    <>
      <div style={{ filter: state.commandPaletteOpen ? APP_ROOT_DIM_FILTER : undefined }}>
        {!state.isAuthenticated ? (
          <LoginScreen />
        ) : isMobile ? (
          <MobileShell />
        ) : (
          <DesktopShell />
        )}
      </div>

      {state.commandPaletteOpen && <CommandPaletteRoot />}
    </>
  );
}

export default App;
