import type { CSSProperties, ReactNode } from 'react';
import { Kbd, cn } from '../ui';

/**
 * PaletteRow — CommandPalette.dc.html's `.row` + `.row-icon`, verbatim.
 *
 * `.row` (already in index.css — applied via className, not redeclared here):
 *   display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:var(--r-md);
 *   border:1px solid transparent;
 * Highlighted row adds `background:var(--surface-2)` (source's inline
 * `style="background:var(--surface-2);"` on the Acme Corp row) — applied here as the `bg-surface-2`
 * utility, which is safe to stack on `.row` because `.row` itself declares no `background` of its own.
 *
 * `.row-icon` is NOT one of the shared classes already in index.css (only `.row` is) — its box model is
 * reproduced here via inline `style` instead of a new global class, since this package may not edit
 * index.css:
 *   width:26px; height:26px; border-radius:var(--r-sm); background:var(--surface-3); display:flex;
 *   align-items:center; justify-content:center; color:var(--text-2); flex-shrink:0;
 * Highlighted row's icon chip: `color:{{accent}}` — the only override, background/size/radius unchanged.
 *
 * Title: `font-size:13.5px; font-weight:600`. Meta: `font-size:11.5px; color:var(--text-3)`.
 * `metaMono` reproduces a real inconsistency in the source, literally, not "fixed": the Suppliers row's
 * meta ("Lead time 14 days · 2 late deliveries this month") carries NO `font-family:var(--mono)`, while
 * the Purchase-orders/Products rows' metas DO — see sampleData.ts and the package report.
 *
 * The `↵` Kbd hint (`variant="default"`, CommandPalette's own `.kbd`) renders ONLY on the highlighted row —
 * absent entirely (not just hidden) on every other row, matching the source markup exactly.
 *
 * `onMouseEnter` re-highlighting on hover is an extrapolation (not shown in a static mockup, which has no
 * pointer state) — a reasonable affordance for a real palette, flagged in the package report.
 */

export interface PaletteRowProps {
  icon: ReactNode;
  title: string;
  meta: string;
  /** Whether the meta line uses `font-family:var(--mono)` — see the header comment's literal-inconsistency note. */
  metaMono?: boolean;
  highlighted?: boolean;
  onSelect: () => void;
  onHoverHighlight?: () => void;
}

const ICON_CHIP_BASE: CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: 'var(--r-sm)',
  background: 'rgb(var(--surface-3))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export function PaletteRow({
  icon,
  title,
  meta,
  metaMono = false,
  highlighted = false,
  onSelect,
  onHoverHighlight,
}: PaletteRowProps) {
  return (
    <div
      role="option"
      aria-selected={highlighted}
      onClick={onSelect}
      onMouseEnter={onHoverHighlight}
      className={cn('row cursor-pointer', highlighted && 'bg-surface-2')}
    >
      <div
        style={{
          ...ICON_CHIP_BASE,
          color: highlighted ? 'rgb(var(--accent))' : 'rgb(var(--text-2))',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{title}</div>
        <div
          className={cn(metaMono && 'font-mono')}
          style={{ fontSize: '11.5px', color: 'rgb(var(--text-3))' }}
        >
          {meta}
        </div>
      </div>
      {highlighted && <Kbd variant="default">↵</Kbd>}
    </div>
  );
}
