import type { ReactNode } from 'react';
import { CountPill, cn } from '../../ui';

/**
 * KanbanColumn — POKanban.dc.html's `.col` + `.col-head`, verbatim:
 *   .col      flex:1; min-width:0; display:flex; flex-direction:column; gap:10px;
 *   .col-head display:flex; align-items:center; justify-content:space-between; padding:0 2px;
 *
 * The label span uses the shared `.label` class (mono/11px/600/uppercase/tracking, default color --text-3)
 * with a per-column Tailwind text-color utility layered on top via `cn()`. This is safe specifically
 * because `.label` lives in index.css's `@layer components`, and Tailwind's utilities layer is always
 * emitted after (and therefore wins over) the components layer regardless of argument order — the same
 * mechanism index.css documents for `.tab`'s active-state color override. It is NOT the same situation as
 * two conflicting Tailwind utilities landing on one element (see Button.tsx's SegmentedToggle comment for
 * that real, shipped bug) — there is only one color utility here, not two.
 *
 * Count pill is the already-built `CountPill` (POKanban.dc.html's `.count`).
 */
export interface KanbanColumnProps {
  label: string;
  /** Tailwind text-color utility for this column's label, e.g. `text-status-info` or `text-accent`. */
  labelClassName: string;
  count: number;
  children?: ReactNode;
  className?: string;
}

export function KanbanColumn({ label, labelClassName, count, children, className }: KanbanColumnProps) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between px-0.5">
        <span className={cn('label', labelClassName)}>{label}</span>
        <CountPill>{count}</CountPill>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
