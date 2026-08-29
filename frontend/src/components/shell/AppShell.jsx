import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { IconRail } from './IconRail';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../CommandPalette';
import { useAppStore } from '../../store/useAppStore';

/**
 * The persistent frame every route renders inside.
 *
 * v2.0: the old always-visible nav column is gone. `IconRail` is the
 * persistent chrome (desktop only, 64px); the full destination list from the
 * old Sidebar now opens on demand as a drawer, triggered from IconRail's
 * "Menu" button or Topbar's hamburger on mobile — both call `openNav`, so
 * there's exactly one source of truth for whether it's open.
 *
 * `min-w-0` on the content column is still load-bearing for the same reason
 * as before: a grid item's default `min-width: auto` lets a wide `<table>`
 * grow the track past the viewport, and the rail with it.
 *
 * <CommandPalette /> stays a SIBLING of the shell, never nested inside a
 * `backdrop-filter` ancestor — that CSS property creates a containing block
 * for `position: fixed` descendants, which would clip a nested fixed overlay
 * to its parent's box instead of the viewport.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const setCmdKOpen = useAppStore((s) => s.setCmdKOpen);

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 bg-canvas text-content">
        <IconRail onOpenMenu={() => setNavOpen(true)} onOpenSearch={() => setCmdKOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setNavOpen(true)} />
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <CommandPalette />
    </>
  );
}

export default AppShell;
