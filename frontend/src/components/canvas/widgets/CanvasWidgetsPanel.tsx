import { CornerBrackets, cn } from '../../ui';
import { CanvasPanelHeader } from './CanvasPanelHeader';
import type { CanvasPanelTab } from './CanvasPanelHeader';
import { AlertRow } from './AlertRow';
import type { AlertRowProps } from './AlertRow';
import { ReorderCard } from './ReorderCard';
import { ForecastChart } from './ForecastChart';

/**
 * CanvasWidgetsPanel — Layer 3 Group A composition. ChatWithCanvas.dc.html's docked canvas panel
 * (`<!-- canvas panel -->`, lines ~100-172), assembled from the pieces above:
 *
 *   header  <CanvasPanelHeader/> (56px, laser-line bottom border, tabs + expand/close icons).
 *   body    flex:1; overflow:auto; padding:24px; display:flex; flex-direction:column; gap:20px.
 *           -> `flex-1 overflow-auto p-6 flex flex-col gap-5` (p-6=24px, gap-5=20px on Tailwind's
 *           default scale).
 *           Three labelled sections, each `flex-col gap:8px` (-> `gap-2`), a `.label` heading:
 *             "Open alerts (3)"                         — 3 `<AlertRow/>`s, `gap-2` between rows (`gap:8px`).
 *             "Reorder suggestion"                      — one `<ReorderCard/>`.
 *             "Forecast — SKU-1042, next 30 days"       — one `<ForecastChart/>`.
 *
 *   TAB BEHAVIOR (explicit decision, since the mockup only ever shows one state): the source markup
 *   renders all three sections in the body regardless of which tab is active — there is no per-tab
 *   markup to observe in a single static mockup, and the design brief explicitly forbids inventing unseen
 *   per-tab content. This component therefore renders the SAME three-section body for every value of
 *   `activeTab` — the prop only drives which tab in `CanvasPanelHeader` is visually active (and is exposed
 *   so Package 5's ShellContext can still wire `canvas.tab` through to something). If a future mockup ever
 *   shows per-tab filtering, that's a new source fact, not a guess to make here.
 *
 *   BRACKETS: the outer `flex:1; min-width:0; position:relative` panel wrapper + `<CornerBrackets
 *   mode="inset"/>` (8px inset — one of the app's only three bracket surfaces, design brief) are rendered
 *   HERE, gated by `showBrackets` (default true), per the task instructions — this is the one panel this
 *   brief explicitly names as a legitimate bracket surface, so defaulting to on is deliberate. Pass
 *   `showBrackets={false}` if a composed screen wants to own that wrapper/positioning itself instead.
 */

export interface CanvasWidgetsPanelProps {
  activeTab: CanvasPanelTab;
  onTabChange?: (tab: CanvasPanelTab) => void;
  onExpand?: () => void;
  onClose?: () => void;

  alerts: AlertRowProps[];
  /** Heading text before the "(N)" count — default "Open alerts", matching the mockup. */
  alertsLabel?: string;

  /**
   * `null` when there's currently no at-risk product to suggest reordering (real data — see
   * `GET /reorder/suggestions` — can honestly be empty) — renders a plain "nothing needs reordering" note
   * instead of a card, rather than fabricating one. `undefined` reorderEmptyMessage falls back to a
   * generic default.
   */
  reorder: { title: string; meta: string; ctaLabel: string; onCtaClick?: () => void } | null;
  /** Default "Reorder suggestion", matching the mockup. */
  reorderLabel?: string;
  reorderEmptyMessage?: string;

  /**
   * `null` when no forecast has been trained yet for the resolved product/warehouse pair (a real,
   * un-fabricated empty state — see this component's header comment and `lib/forecastPoints.ts`).
   * `series2Points`/`series2Label` are optional per model-type availability — see `ForecastChart`'s own
   * header comment.
   */
  forecast: {
    series1Points: string;
    series2Points?: string;
    series1Label: string;
    series2Label?: string;
  } | null;
  forecastEmptyMessage?: string;
  /** Full section heading, e.g. "Forecast — SKU-1042, next 30 days" — product-specific, required. */
  forecastLabel: string;

  /** Renders the panel's outer relative wrapper + inset CornerBrackets. Default true. */
  showBrackets?: boolean;
  className?: string;
}

export function CanvasWidgetsPanel({
  activeTab,
  onTabChange,
  onExpand,
  onClose,
  alerts,
  alertsLabel = 'Open alerts',
  reorder,
  reorderLabel = 'Reorder suggestion',
  reorderEmptyMessage = 'Nothing currently needs reordering.',
  forecast,
  forecastEmptyMessage = 'No forecast trained yet for this product/warehouse pair.',
  forecastLabel,
  showBrackets = true,
  className,
}: CanvasWidgetsPanelProps) {
  const body = (
    <>
      <CanvasPanelHeader activeTab={activeTab} onTabChange={onTabChange} onExpand={onExpand} onClose={onClose} />

      <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
        <section className="flex flex-col gap-2">
          <div className="label">
            {alertsLabel} ({alerts.length})
          </div>
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => (
              <AlertRow key={i} {...alert} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="label">{reorderLabel}</div>
          {reorder ? (
            <ReorderCard {...reorder} />
          ) : (
            <div className="font-mono" style={{ fontSize: '12px', color: 'rgb(var(--text-3))' }}>
              {reorderEmptyMessage}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="label">{forecastLabel}</div>
          {forecast ? (
            <ForecastChart {...forecast} />
          ) : (
            <div className="font-mono" style={{ fontSize: '12px', color: 'rgb(var(--text-3))' }}>
              {forecastEmptyMessage}
            </div>
          )}
        </section>
      </div>
    </>
  );

  if (!showBrackets) {
    return <div className={cn('flex min-w-0 flex-col', className)}>{body}</div>;
  }

  return (
    <div className={cn('relative flex min-w-0 flex-1 flex-col', className)}>
      <CornerBrackets mode="inset" />
      {body}
    </div>
  );
}
