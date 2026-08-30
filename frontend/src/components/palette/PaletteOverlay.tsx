import { cn } from '../ui';
import { CommandPalette } from './CommandPalette';
import type { CommandPaletteProps } from './CommandPalette';

/**
 * PaletteOverlay — CommandPalette.dc.html's outer overlay, minus the mockup's own dimmed background copy.
 *
 * The source's outermost `.hud-bg` div contains THREE layers: (1) a hand-drawn dimmed copy of the home
 * screen (`filter:brightness(.4) blur(1px)`), (2) the `rgba(0,0,0,.55)` scrim, (3) the palette. Layer (1)
 * is a static-mockup artifact — a real app can't duplicate its own live DOM into an overlay just to dim it.
 * Design brief, Layer 4 ("command-palette-open"): "dim/blur the live app root directly with a CSS `filter`,
 * don't fake a duplicated DOM copy." So `PaletteOverlay` renders ONLY layers (2) and (3); it is Package 5's
 * job (composing the top-level app shell) to apply `APP_ROOT_DIM_FILTER` below to the real app root element
 * that sits BEHIND this overlay in the DOM, conditionally on `commandPaletteOpen`.
 *
 * `position:fixed; inset:0` (mirroring the source's `position:absolute;inset:0` on a full-viewport parent)
 * gives both the scrim and the palette's `position:absolute` a viewport-anchored positioning context, so
 * `CommandPalette`'s own `top:140px; left:50%; transform:translateX(-50%)` lands centered in the viewport,
 * not inside whatever ancestor happens to render this overlay.
 *
 * Clicking the scrim fires `onClose` (extrapolation — the mockup is static and shows no click behavior;
 * `Escape`-to-close is ShellContext's job already, this is the equivalent mouse affordance for the same
 * action). Clicking inside the palette itself does not reach this handler, since the scrim and the palette
 * are sibling elements, not nested — a click on the palette never bubbles through the scrim's own listener.
 */

/**
 * The exact `filter` value the design brief specifies for dimming the live app root while the palette is
 * open. Exported so Package 5 (top-level app composition) applies it to the real app root element instead
 * of guessing the value — see this file's header comment.
 */
export const APP_ROOT_DIM_FILTER = 'brightness(.4) blur(1px)';

export interface PaletteOverlayProps
  extends Pick<CommandPaletteProps, 'query' | 'groups' | 'highlightedId' | 'onHighlightChange' | 'onSelect'> {
  onClose: () => void;
  className?: string;
}

export function PaletteOverlay({
  query,
  groups,
  highlightedId,
  onHighlightChange,
  onSelect,
  onClose,
  className,
}: PaletteOverlayProps) {
  return (
    <div className={cn('fixed inset-0', className)} style={{ zIndex: 50 }}>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}
      />
      <CommandPalette
        query={query}
        groups={groups}
        highlightedId={highlightedId}
        onHighlightChange={onHighlightChange}
        onSelect={onSelect}
      />
    </div>
  );
}
