import { useState } from 'react';
import { CornerBrackets, cn } from '../../ui';
import { POKanbanHeader } from './POKanbanHeader';
import type { POKanbanView } from './POKanbanHeader';
import { POKanbanBoard } from './POKanbanBoard';
import type { SampleColumnData } from './sampleData';

/**
 * POKanbanPanel — composes header + board inside the panel wrapper. Verbatim from POKanban.dc.html's
 * outer panel div:
 *   flex:1; min-width:0; display:flex; flex-direction:column; position:relative;
 * with `<CornerBrackets mode="inset" />` (8px inset) — this panel is one of exactly three surfaces in the
 * app permitted to carry CornerBrackets/LaserLine (the design brief's "Fidelity checklist"), alongside
 * ChatWithCanvas's docked panel and the command palette.
 *
 * `showBrackets` defaults to true; exposed as a prop per the package brief rather than hardcoded, in case
 * a future composed screen needs to suppress it (none currently do).
 *
 * The Kanban/List toggle is uncontrolled by default (local `useState`, initial "kanban" — the only state
 * the mockup shows) so the preview harness demonstrates a working pill without inventing a "List" view
 * that has no mockup of its own; a caller may still fully control it via `view`/`onViewChange`.
 */
export interface POKanbanPanelProps {
  showBrackets?: boolean;
  view?: POKanbanView;
  onViewChange?: (view: POKanbanView) => void;
  onBackToChat?: () => void;
  onNewPO?: () => void;
  columns?: readonly SampleColumnData[];
  className?: string;
}

export function POKanbanPanel({
  showBrackets = true,
  view,
  onViewChange,
  onBackToChat,
  onNewPO,
  columns,
  className,
}: POKanbanPanelProps) {
  const [internalView, setInternalView] = useState<POKanbanView>('kanban');
  const resolvedView = view ?? internalView;

  const handleViewChange = (next: POKanbanView) => {
    setInternalView(next);
    onViewChange?.(next);
  };

  return (
    <div className={cn('relative flex min-w-0 flex-1 flex-col', className)}>
      {showBrackets && <CornerBrackets mode="inset" />}
      <POKanbanHeader
        view={resolvedView}
        onViewChange={handleViewChange}
        onBackToChat={onBackToChat}
        onNewPO={onNewPO}
      />
      <POKanbanBoard columns={columns} />
    </div>
  );
}
