import type { ReactNode } from 'react';
import type { CanvasState, MessageAttachment } from '../components/shell';

/**
 * scriptedResponses — the deterministic quick-prompt/free-text → canned-reply + canvas-action table the
 * design brief's "Interaction model" calls for. Nothing here is a real AI or a real data source: every
 * reply is fixed copy (mostly transcribed from the mockups' own copy), and every canvas action is a fixed
 * `CanvasState` value. Typing anything not in `SCRIPTED_RESPONSES` (or clicking a quick-prompt chip whose
 * exact text isn't a key here) falls back to `DEFAULT_RESPONSE`, so the input is never a dead end.
 */

export interface ScriptedResponse {
  reply: ReactNode;
  attachment?: MessageAttachment;
  canvas: NonNullable<CanvasState>;
}

/** The four chips shown on the empty-chat-home screen — verbatim copy from Main.dc.html. */
export const QUICK_PROMPTS = [
  'What needs reordering?',
  'Show open alerts',
  'Forecast SKU-1042',
  "This week's purchase orders",
] as const;

/**
 * "What needs reordering?" reuses ChatWithCanvas.dc.html's exact reply + embedded draft-PO confirm card —
 * that mockup's whole scene IS the answer to a reordering question, so no copy is invented here.
 */
const REORDER_REPLY: ScriptedResponse = {
  reply: (
    <>
      Three products are below their reorder point — I've opened them in the canvas. One stands out:{' '}
      <strong>Acme Corp</strong> has had two late deliveries this month, both tied to SKU-1042. I've drafted
      a purchase order to cover the shortfall.
    </>
  ),
  attachment: {
    type: 'confirm-po',
    data: {
      title: 'Create purchase order',
      body: (
        <>
          Acme Corp · Main Warehouse
          <br />
          3 line items · est. $1,240.00
        </>
      ),
      primaryLabel: 'Review & create',
      secondaryLabel: 'Dismiss',
    },
  },
  canvas: { mode: 'widgets', tab: 'reorder' },
};

const ALERTS_REPLY: ScriptedResponse = {
  reply: "Here's everything currently open — three products are below their reorder point, two of them critically.",
  canvas: { mode: 'widgets', tab: 'alerts' },
};

const FORECAST_REPLY: ScriptedResponse = {
  reply:
    "Here's the 30-day forecast for SKU-1042 from both trained models — random forest and exponential smoothing agree on the downward trend.",
  canvas: { mode: 'widgets', tab: 'forecast' },
};

/**
 * "This week's purchase orders" is the table's second (independent of the ReorderCard's "Create PO"
 * button) route into the Kanban board — a deliberate choice so the escalation path isn't demonstrated only
 * one way. Not sourced from any single mockup line; a reasonable scripted mapping for a PO-shaped question.
 */
const PURCHASE_ORDERS_REPLY: ScriptedResponse = {
  reply: "Here's the board — six are in draft, one submitted, two approved, one partially received.",
  canvas: { mode: 'kanban' },
};

export const SCRIPTED_RESPONSES: Record<string, ScriptedResponse> = {
  'What needs reordering?': REORDER_REPLY,
  'Show open alerts': ALERTS_REPLY,
  'Forecast SKU-1042': FORECAST_REPLY,
  "This week's purchase orders": PURCHASE_ORDERS_REPLY,
};

/** Anything typed free-hand that doesn't match a scripted key — honest about being a fixed demo, not a real AI. */
export const DEFAULT_RESPONSE: ScriptedResponse = {
  reply:
    "This is a scripted preview, so I only know how to answer the prompts above — try one of those, or ask about reordering, alerts, forecasts, or purchase orders.",
  canvas: { mode: 'widgets', tab: 'alerts' },
};

export function resolveScriptedResponse(input: string): ScriptedResponse {
  return SCRIPTED_RESPONSES[input.trim()] ?? DEFAULT_RESPONSE;
}
