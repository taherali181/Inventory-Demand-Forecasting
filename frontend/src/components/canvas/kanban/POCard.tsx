import type { CSSProperties } from 'react';
import { Card, cn } from '../../ui';

/**
 * POCard — one Kanban card. Verbatim from POKanban.dc.html's `.po-card` rule:
 *   background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:12px;
 *   display:flex; flex-direction:column; gap:6px; border-left:2px solid var(--border);
 * — the left border is 2px and defaults to the neutral `--border`; every non-Draft card in source overrides
 * it with an inline `border-left-color` (e.g. `style="border-left-color:var(--info);"`). That per-column
 * value is threaded through as the `borderColor` prop and applied via `style`, never a generated Tailwind
 * class (Tailwind can't see a dynamically-built class name, and this is a genuinely per-usage value — see
 * the package brief's file-ownership/`cn()` constraints).
 *
 * Row styles, also verbatim from source:
 *   PO number   font-size:13px; font-weight:600; font-family:mono   (in a `flex;justify-content:space-between` row —
 *               the row has only the one child in source; reproduced literally, not "fixed" into a plain span)
 *   supplier    font-size:12.5px; color:var(--text-2)
 *   meta        font-size:11.5px; color:var(--text-3); font-family:mono
 *
 * Cancelled (PO-1019 in source): `opacity:.55` on the whole card + `text-decoration:line-through` on the PO
 * number ONLY (not the supplier/meta rows).
 *
 * Partially-received (PO-1032 in source): after the meta line, a progress track —
 *   height:3px; border-radius:999px; background:var(--surface-3); overflow:hidden; margin-top:2px
 * — with an inner bar `height:100%; background:var(--warn)`. Source hardcodes the bar to `width:60%` for
 * "3 of 5 items received" (3/5 = 60%, confirmed) — this component derives the percentage from
 * `progress.received / progress.total` instead of hardcoding 60, per the package brief.
 */
export interface POCardProgress {
  received: number;
  total: number;
}

export interface POCardProps {
  poNumber: string;
  supplier: string;
  /** e.g. "3 items · $1,240.00", or "3 of 5 items received" when `progress` is set. */
  meta: string;
  /** This card's column's left-border color (e.g. `rgb(var(--info))`). Omit for Draft — stays neutral. */
  borderColor?: string;
  cancelled?: boolean;
  progress?: POCardProgress;
  className?: string;
}

export function POCard({
  poNumber,
  supplier,
  meta,
  borderColor,
  cancelled = false,
  progress,
  className,
}: POCardProps) {
  const cardStyle: CSSProperties = {
    borderLeftWidth: '2px',
    borderLeftColor: borderColor ?? 'rgb(var(--border))',
    ...(cancelled ? { opacity: 0.55 } : null),
  };

  const percent =
    progress && progress.total > 0
      ? Math.max(0, Math.min(100, (progress.received / progress.total) * 100))
      : 0;

  return (
    <Card
      radius="md"
      border="hairline"
      className={cn('flex flex-col gap-1.5 p-3', className)}
      style={cardStyle}
    >
      <div className="flex justify-between">
        <span
          className={cn('font-mono font-semibold', cancelled && 'line-through')}
          style={{ fontSize: '13px' }}
        >
          {poNumber}
        </span>
      </div>
      <div className="text-content-secondary" style={{ fontSize: '12.5px' }}>
        {supplier}
      </div>
      <div className="font-mono text-content-muted" style={{ fontSize: '11.5px' }}>
        {meta}
      </div>
      {progress && (
        <div
          className="overflow-hidden bg-surface-3"
          style={{ height: '3px', borderRadius: '999px', marginTop: '2px' }}
        >
          <div className="h-full bg-status-warn" style={{ width: `${percent}%` }} />
        </div>
      )}
    </Card>
  );
}
