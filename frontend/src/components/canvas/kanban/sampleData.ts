/**
 * sampleData.ts — the mockup's exact PO data, verbatim from POKanban.dc.html.
 *
 * Per-card fields (PO number / supplier / meta string) and per-column counts are transcribed 1:1 from the
 * source's inline markup. Note the source's `.count` pills read **2, 1, 2, 1, 3, 1** (Draft, Submitted,
 * Approved, Partially received, Received, Cancelled) while the actual `<div class="po-card">` elements
 * rendered are 2, 1, 2, 1, **2**, 1 — the "Received" column's count pill says 3 but only two cards
 * (PO-1028, PO-1025) are actually in the markup. That is a real inconsistency in the mockup source, not a
 * transcription error here — see this package's report for the flag. `count` is kept as its own field
 * (the honest backlog size the pill claims), independent of `cards.length` (what's actually rendered), so
 * this preview reproduces the mockup's numbers exactly rather than "fixing" the mismatch.
 */
import type { POStatus } from './POKanbanBoard';

export interface SamplePOCardData {
  poNumber: string;
  supplier: string;
  /** e.g. "3 items · $1,240.00", or "3 of 5 items received" when `progress` is set. */
  meta: string;
  progress?: { received: number; total: number };
}

export interface SampleColumnData {
  status: POStatus;
  /** The column's `.count` pill value from source — not always equal to `cards.length` (see header comment). */
  count: number;
  cards: SamplePOCardData[];
}

export const SAMPLE_KANBAN_DATA: readonly SampleColumnData[] = [
  {
    status: 'draft',
    count: 2,
    cards: [
      { poNumber: 'PO-1048', supplier: 'Acme Corp', meta: '3 items · $1,240.00' },
      { poNumber: 'PO-1049', supplier: 'Northline Supply', meta: '1 item · $380.00' },
    ],
  },
  {
    status: 'submitted',
    count: 1,
    cards: [{ poNumber: 'PO-1044', supplier: 'Delta Fasteners', meta: '5 items · $2,910.00' }],
  },
  {
    status: 'approved',
    count: 2,
    cards: [
      { poNumber: 'PO-1041', supplier: 'Acme Corp', meta: '2 items · $940.00' },
      { poNumber: 'PO-1039', supplier: 'Northline Supply', meta: '4 items · $1,610.00' },
    ],
  },
  {
    status: 'partially_received',
    count: 1,
    cards: [
      {
        poNumber: 'PO-1032',
        supplier: 'Delta Fasteners',
        meta: '3 of 5 items received',
        // Source hardcodes the bar to width:60% — 3/5 = 0.6 = 60%, confirmed. Stored as {received,total}
        // so POCard derives the percentage instead of a caller hardcoding it a second time.
        progress: { received: 3, total: 5 },
      },
    ],
  },
  {
    status: 'received',
    count: 3, // source pill says 3; only 2 cards are actually in the markup — see header comment.
    cards: [
      { poNumber: 'PO-1028', supplier: 'Acme Corp', meta: '6 items · $3,120.00' },
      { poNumber: 'PO-1025', supplier: 'Northline Supply', meta: '2 items · $560.00' },
    ],
  },
  {
    status: 'cancelled',
    count: 1,
    cards: [{ poNumber: 'PO-1019', supplier: 'Delta Fasteners', meta: '2 items · $470.00' }],
  },
];
