import { cn } from '../../ui';
import { KanbanColumn } from './KanbanColumn';
import { POCard } from './POCard';
import { SAMPLE_KANBAN_DATA } from './sampleData';
import type { SampleColumnData } from './sampleData';

/**
 * POKanbanBoard — the scrollable board body. Verbatim from POKanban.dc.html's board container:
 *   flex:1; overflow:auto; padding:24px; display:flex; gap:14px;
 * with the 6 columns in the exact order/colors specified by the design brief (Layer 3, Group B):
 *
 *   column               label color              card left-border color
 *   Draft                text-content-muted        (none — stays the card's neutral --border default)
 *   Submitted             text-status-info          var(--info)
 *   Approved              text-accent               var(--accent)
 *   Partially received    text-status-warn          var(--warn)
 *   Received              text-status-good          var(--good)
 *   Cancelled             text-status-bad            var(--bad)
 *
 * `KANBAN_COLUMNS` is the single typed constant the brief asks for so this order/color mapping can't drift
 * between KanbanColumn (label color) and POCard (left-border color) — both are driven from the one array
 * below, never restated.
 */
export type POStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface KanbanColumnDef {
  status: POStatus;
  label: string;
  labelClassName: string;
  /** Left-border color for this column's cards. `undefined` = Draft's neutral default (`var(--border)`). */
  borderColor?: string;
}

export const KANBAN_COLUMNS: readonly KanbanColumnDef[] = [
  { status: 'draft', label: 'Draft', labelClassName: 'text-content-muted' },
  {
    status: 'submitted',
    label: 'Submitted',
    labelClassName: 'text-status-info',
    borderColor: 'rgb(var(--info))',
  },
  {
    status: 'approved',
    label: 'Approved',
    labelClassName: 'text-accent',
    borderColor: 'rgb(var(--accent))',
  },
  {
    status: 'partially_received',
    label: 'Partially received',
    labelClassName: 'text-status-warn',
    borderColor: 'rgb(var(--warn))',
  },
  {
    status: 'received',
    label: 'Received',
    labelClassName: 'text-status-good',
    borderColor: 'rgb(var(--good))',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    labelClassName: 'text-status-bad',
    borderColor: 'rgb(var(--bad))',
  },
];

export interface POKanbanBoardProps {
  /** Per-column PO data. Defaults to the mockup's exact sample data (`sampleData.ts`). */
  columns?: readonly SampleColumnData[];
  className?: string;
}

export function POKanbanBoard({ columns = SAMPLE_KANBAN_DATA, className }: POKanbanBoardProps) {
  return (
    <div className={cn('flex flex-1 gap-3.5 overflow-auto p-6', className)}>
      {KANBAN_COLUMNS.map((def) => {
        const data = columns.find((c) => c.status === def.status);
        return (
          <KanbanColumn
            key={def.status}
            label={def.label}
            labelClassName={def.labelClassName}
            count={data?.count ?? 0}
          >
            {(data?.cards ?? []).map((card) => (
              <POCard
                key={card.poNumber}
                poNumber={card.poNumber}
                supplier={card.supplier}
                meta={card.meta}
                borderColor={def.borderColor}
                cancelled={def.status === 'cancelled'}
                progress={card.progress}
              />
            ))}
          </KanbanColumn>
        );
      })}
    </div>
  );
}
