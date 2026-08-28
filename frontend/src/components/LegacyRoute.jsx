import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Layout route for pages not yet converted to the new design system.
 *
 * `.legacy-surface` is what activates the scoped rules in App.css — without it
 * those pages render as unstyled markup. It also carries the legacy color
 * variables, which now resolve to design tokens, so these pages read correctly
 * in both themes while they wait their turn.
 *
 * This now nests INSIDE AppShell, which owns the sidebar, topbar and the full
 * height chain — so no `min-h-screen` here. A viewport-height minimum on a box
 * that already sits below a 56px header overflows the shell by exactly the
 * header's height and produces a second, outer scrollbar.
 */
export function LegacyRoute() {
  // Full-bleed with p-6, matching the studio views' idiom. These pages had no
  // wrapper at all before, so a max-width here would have *narrowed* them.
  return (
    <div className="legacy-surface h-full w-full overflow-y-auto p-6">
      <Outlet />
    </div>
  );
}
