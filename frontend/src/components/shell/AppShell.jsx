import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../CommandPalette';

/**
 * The persistent frame every route renders inside.
 *
 * Two things here are load-bearing and easy to undo by accident:
 *
 *  1. `min-w-0` on the content column. The grid track is `1fr`, and a grid
 *     item's default `min-width: auto` lets its content set the floor — so a
 *     single wide <table> grows the track past the viewport and pushes the
 *     sidebar off-screen. `min-w-0` lets the track actually shrink, and the
 *     table scrolls inside its own container instead.
 *
 *  2. <CommandPalette /> is a SIBLING of the glass topbar, never a child.
 *     backdrop-filter establishes a containing block for position:fixed
 *     descendants, so a fixed overlay nested inside the header would size to
 *     the 56px header and render clipped in the corner.
 *
 * The height chain (html/body/#root at 100%, .App a flex column) is already
 * established upstream; this keeps `h-full min-h-0` flowing down. Do not
 * reintroduce a viewport-minus-header calc height anywhere below — it
 * hard-codes the header height and drifts the moment the header changes.
 * (Writing that class literally in a comment is not harmless either: Tailwind
 * scans comments too and would emit the utility for real.)
 */
export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <div className="grid h-full min-h-0 flex-1 grid-cols-[auto_1fr] bg-canvas text-content">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

        <div className="flex min-w-0 flex-col">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <CommandPalette />
    </>
  );
}

export default AppShell;
