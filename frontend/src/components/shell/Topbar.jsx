import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShieldAlert } from 'lucide-react';
import { cn } from '../ui/cn';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../context/AuthContext';
import * as alertsApi from '../../api/alerts';

/*
 * Floating chrome above the routed content — one of the four surfaces allowed
 * to use `.glass`.
 *
 * Deliberately NOT here any more (all migrated out of ModernNavbar):
 *  - the logo lock-up: it lives at the head of the sidebar, where the app's
 *    identity belongs once there is a persistent rail;
 *  - the "2.0" badge and the "AI Supply Chain OS" eyebrow: overclaiming copy;
 *  - the sound toggle: sound is gone from the product, and the slot it used to
 *    occupy is now the theme control in the sidebar footer;
 *  - the quick studio buttons: the sidebar covers every destination, including
 *    the ten that previously had none.
 *
 * `position: fixed` descendants must NOT be nested inside this element —
 * backdrop-filter makes it their containing block, so a fixed overlay would
 * size to this 56px header. The command palette is a sibling, in AppShell.
 */

export function Topbar({ onOpenMobileNav }) {
  const setCmdKOpen = useAppStore((s) => s.setCmdKOpen);
  const unreadAlertsCount = useAppStore((s) => s.unreadAlertsCount);
  const setUnreadAlertsCount = useAppStore((s) => s.setUnreadAlertsCount);
  const { user } = useAuth();

  useEffect(() => {
    alertsApi
      .listAlerts('open')
      .then((res) => {
        const count = res.items?.length ?? (Array.isArray(res) ? res.length : 0);
        setUnreadAlertsCount(count);
      })
      .catch(() => {});
  }, [setUnreadAlertsCount]);

  const hasAlerts = unreadAlertsCount > 0;

  return (
    <header
      className={cn(
        'glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 rounded-none',
        'border-x-0 border-t-0 border-b border-hairline px-3 sm:px-4'
      )}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-content lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Cmd+K launcher. A button, not an input — the real search field lives
          inside the palette, and two focusable search affordances on one screen
          is exactly the ambiguity that makes people not use either. */}
      <button
        type="button"
        onClick={() => setCmdKOpen(true)}
        className={cn(
          'flex h-9 w-full max-w-sm items-center justify-between gap-2 rounded-md',
          'border border-hairline bg-surface px-3 text-sm text-content-muted',
          'transition-colors duration-150 hover:border-hairline-strong hover:text-content-secondary'
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search or run a command</span>
        </span>
        <kbd className="hidden shrink-0 rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-content-muted sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link
          to="/alerts"
          title={hasAlerts ? 'Open low-stock alerts' : 'No open alerts'}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium',
            'transition-colors duration-150',
            hasAlerts
              ? 'border-status-bad/25 bg-status-bad/10 text-status-bad hover:bg-status-bad/15'
              : 'border-hairline bg-surface text-content-secondary hover:bg-surface-2 hover:text-content'
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          <span className="tabular-nums">
            {hasAlerts ? `${unreadAlertsCount} open` : 'No alerts'}
          </span>
        </Link>

        {/* Signed-in identity and sign-out live in the sidebar footer, so the
            topbar only carries the signed-out call to action. This was an
            <a href="/login">, which forced a full document reload and threw
            away the in-memory auth state on the way to the login page. */}
        {!user && (
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg shadow-sm transition-colors duration-150 hover:bg-accent-hover"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export default Topbar;
