import { Button, SegmentedToggle, cn, laserLineBorder } from '../../ui';
import type { SegmentedToggleOption } from '../../ui';

/**
 * POKanbanHeader — POKanban.dc.html's 56px panel header, verbatim:
 *   height:56px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
 *   padding:0 24px; border-bottom: [laser-line form — see LaserLine.tsx form 1]
 *
 * Left group (gap:10px):
 *   "Back to chat" — display:flex; align-items:center; gap:6px; font-size:12.5px; color:{{accent}};
 *                    font-weight:600; cursor:pointer — plus the 14×14 chevron `M15 6l-6 6 6 6`,
 *                    stroke-width 2, round caps/joins.
 *   divider        — width:1px; height:16px; background:var(--border)
 *   "Purchase orders" — font-size:14px; font-weight:600
 *
 * Right group (gap:10px):
 *   SegmentedToggle (Kanban/List, Kanban active — this header always renders it Kanban-active per the
 *   mockup; `view`/`onViewChange` let a caller drive it, defaulting to uncontrolled local-only behavior via
 *   POKanbanPanel)
 *   primary Button "+ New PO" — padding:"8px 14px"; font-size:12.5px; notch:8 (verbatim source values).
 */
export type POKanbanView = 'kanban' | 'list';

const VIEW_OPTIONS: ReadonlyArray<SegmentedToggleOption<POKanbanView>> = [
  { value: 'kanban', label: 'Kanban' },
  { value: 'list', label: 'List' },
];

export interface POKanbanHeaderProps {
  view?: POKanbanView;
  onViewChange?: (view: POKanbanView) => void;
  onBackToChat?: () => void;
  onNewPO?: () => void;
  className?: string;
}

/** `<path d="M15 6l-6 6 6 6"/>`, stroke-width 2, round caps/joins — the "Back to chat" chevron. */
function BackChevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function POKanbanHeader({
  view = 'kanban',
  onViewChange,
  onBackToChat,
  onNewPO,
  className,
}: POKanbanHeaderProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-between', laserLineBorder, className)}
      style={{ height: '56px', padding: '0 24px' }}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBackToChat}
          className="inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-semibold text-accent"
          style={{ fontSize: '12.5px' }}
        >
          <BackChevron />
          Back to chat
        </button>
        <div className="bg-hairline" style={{ width: '1px', height: '16px' }} />
        <span className="font-semibold" style={{ fontSize: '14px' }}>
          Purchase orders
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <SegmentedToggle
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
          aria-label="Board view"
        />
        <Button variant="primary" notch={8} padding="8px 14px" fontSize={12.5} onClick={onNewPO}>
          + New PO
        </Button>
      </div>
    </div>
  );
}
