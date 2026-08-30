import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { CornerBrackets, Kbd, cn, laserLineBorder } from '../ui';
import { PaletteRow } from './PaletteRow';

/**
 * CommandPalette — CommandPalette.dc.html's palette shell, verbatim, minus the two flanking
 * background/scrim layers (that's `PaletteOverlay`'s job).
 *
 * Shell:
 *   position:absolute; top:140px; left:50%; transform:translateX(-50%); width:560px;
 *   background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--r-lg);
 *   display:flex; flex-direction:column; overflow:visible;
 *   (`overflow:visible` is load-bearing — the outset CornerBrackets sit outside this box and must not be
 *   clipped. This div is also the positioning context for those brackets, since `position:absolute`
 *   establishes one for its own children regardless of value.)
 *
 * Search row:
 *   display:flex; align-items:center; gap:10px; padding:16px 18px; + `.laser-line` bottom border +
 *   border-radius:var(--r-lg) var(--r-lg) 0 0; overflow:hidden; background:var(--surface).
 *   Contents: 18×18 search glyph (circle cx11 cy11 r7 + path M21 21l-4.3-4.3, stroke-width 1.7,
 *   color:var(--text-3)); a flex:1 query span (font-size:15px; color:var(--text); font-family:var(--mono))
 *   with the `.palette-caret` block inline after the text; an `esc` span
 *   (font-size:12px; color:var(--text-3); font-family:var(--mono)) — bare text, NOT a `.kbd` chip, per the
 *   source (the footer's `esc` below IS a chip; both are transcribed literally, not unified).
 *
 * Results container: padding:10px; display:flex; flex-direction:column; gap:2px. Group `.label` headings:
 *   padding:8px 14px 4px for the FIRST group, padding:12px 14px 4px for every subsequent group — both
 *   transcribed literally from the source's two different inline `style` attributes.
 *
 * Footer: display:flex; align-items:center; gap:14px; padding:10px 18px; border-top:1px solid var(--border);
 *   border-radius:0 0 var(--r-lg) var(--r-lg); overflow:hidden; background:var(--surface). Each hint:
 *   gap:5px; font-size:11px; font-family:var(--mono); color:var(--text-3); a `.kbd` chip then its word —
 *   `↑↓ navigate`, `↵ open`, `esc close`.
 *
 * Keyboard handling (ArrowUp/ArrowDown move the highlight, Enter fires the highlighted row's `onSelect`) is
 * a real interaction the static mockup can't demonstrate but the footer's own hint bar promises — wired via
 * a React `onKeyDown` on this component's own root (auto-focused on mount), NOT a second global `window`
 * listener: `ShellContext` already owns the app-wide `⌘K`/`Escape` listener and this package must not add
 * another one alongside it.
 */

export interface PaletteResultRow {
  id: string;
  icon: ReactNode;
  title: string;
  meta: string;
  /** See PaletteRow's header comment — a real, literal source inconsistency, not a typo. */
  metaMono?: boolean;
}

export interface PaletteGroup {
  label: string;
  rows: PaletteResultRow[];
}

export interface CommandPaletteProps {
  /** Display-only query text (design brief: "the query is display-only in the mockup"). */
  query: string;
  groups: PaletteGroup[];
  highlightedId: string | null;
  onHighlightChange: (id: string) => void;
  onSelect: (row: PaletteResultRow) => void;
  className?: string;
}

const SHELL_STYLE: CSSProperties = {
  position: 'absolute',
  top: '140px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '560px',
  background: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border-strong))',
  borderRadius: 'var(--r-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'visible',
  outline: 'none',
};

const SEARCH_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '16px 18px',
  borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
  overflow: 'hidden',
  background: 'rgb(var(--surface))',
};

const RESULTS_STYLE: CSSProperties = {
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const FOOTER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '10px 18px',
  borderTop: '1px solid rgb(var(--border))',
  borderRadius: '0 0 var(--r-lg) var(--r-lg)',
  overflow: 'hidden',
  background: 'rgb(var(--surface))',
};

const FOOTER_HINT_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '11px',
  fontFamily: 'var(--mono)',
  color: 'rgb(var(--text-3))',
};

function FooterHint({ keys, label }: { keys: string; label: string }) {
  return (
    <div style={FOOTER_HINT_STYLE}>
      <Kbd>{keys}</Kbd> {label}
    </div>
  );
}

export function CommandPalette({
  query,
  groups,
  highlightedId,
  onHighlightChange,
  onSelect,
  className,
}: CommandPaletteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const flatRows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  // Auto-focus so ↑/↓/Enter work immediately once the palette mounts — there is no real `<input>` in the
  // source to focus instead (the query is a display-only span; see the header comment).
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (flatRows.length === 0) return;
    const currentIndex = flatRows.findIndex((row) => row.id === highlightedId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (currentIndex + 1 + flatRows.length) % flatRows.length;
      onHighlightChange(flatRows[nextIndex].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (currentIndex - 1 + flatRows.length) % flatRows.length;
      onHighlightChange(flatRows[prevIndex].id);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = flatRows[currentIndex] ?? flatRows[0];
      onSelect(row);
    }
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Command palette"
      onKeyDown={handleKeyDown}
      className={cn(className)}
      style={SHELL_STYLE}
    >
      <CornerBrackets mode="outset" />

      <div className={laserLineBorder} style={SEARCH_ROW_STYLE}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'rgb(var(--text-3))' }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span
          style={{ flex: 1, fontSize: '15px', color: 'rgb(var(--text))', fontFamily: 'var(--mono)' }}
        >
          {query}
          <span className="palette-caret" aria-hidden="true" />
        </span>
        <span style={{ fontSize: '12px', color: 'rgb(var(--text-3))', fontFamily: 'var(--mono)' }}>
          esc
        </span>
      </div>

      <div role="listbox" aria-label="Results" style={RESULTS_STYLE}>
        {groups.map((group, groupIndex) => (
          <Fragment key={group.label}>
            <div
              className="label"
              style={{ padding: groupIndex === 0 ? '8px 14px 4px' : '12px 14px 4px' }}
            >
              {group.label}
            </div>
            {group.rows.map((row) => (
              <PaletteRow
                key={row.id}
                icon={row.icon}
                title={row.title}
                meta={row.meta}
                metaMono={row.metaMono}
                highlighted={row.id === highlightedId}
                onSelect={() => onSelect(row)}
                onHoverHighlight={() => onHighlightChange(row.id)}
              />
            ))}
          </Fragment>
        ))}
      </div>

      <div style={FOOTER_STYLE}>
        <FooterHint keys="↑↓" label="navigate" />
        <FooterHint keys="↵" label="open" />
        <FooterHint keys="esc" label="close" />
      </div>
    </div>
  );
}
