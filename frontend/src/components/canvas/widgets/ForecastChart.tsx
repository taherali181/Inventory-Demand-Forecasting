import { Card, cn } from '../../ui';

/**
 * ForecastChart — Layer 3 Group A. ChatWithCanvas.dc.html's forecast card, verbatim:
 *
 *   card     border:1px solid var(--border) (hairline, NOT strong); background:var(--surface);
 *            border-radius:var(--r-lg); padding:16px. -> `Card radius="lg" border="hairline"` + `p-4`.
 *   svg      width="100%" height="90" viewBox="0 0 400 90" preserveAspectRatio="none".
 *   series 1 solid: <polyline fill="none" stroke="var(--info)" stroke-width="2" points="..."/>
 *   series 2 dashed: <polyline fill="none" stroke="{{accent}}" stroke-width="2" stroke-dasharray="4 3"
 *            points="..."/>
 *   legend   display:flex; gap:16px; margin-top:8px ( -> `gap-4 mt-2`). Each entry: display:flex;
 *            align-items:center; gap:6px ( -> `gap-1.5`); font-size:11px; font-family:mono; color:--text-3;
 *            with a 10x2px inline-block swatch in the matching line's colour (info for series 1, accent
 *            for series 2).
 *
 * `points` strings and legend labels are entirely prop-driven — the mockup's own exact strings
 * ("0,60 40,55 ..." / "Random forest" / "Exp. smoothing") live in ../sampleData.ts, not here.
 */

export interface ForecastChartProps {
  /** Solid series (source: stroke="var(--info)"). SVG `points` attribute string, viewBox "0 0 400 90". */
  series1Points: string;
  /**
   * Dashed series (source: stroke="{{accent}}" stroke-dasharray="4 3"). Same viewBox/points format.
   * Optional — real backend data (`GET /forecast/compare`) may have only one trained model type for a
   * given product/warehouse pair, unlike the mockup's fixed two-series sample. Omit both `series2Points`
   * and `series2Label` together to render a single-series chart with no second legend entry, rather than
   * showing an empty/duplicate line — deliberate, minimal deviation from the mockup's always-two-series
   * source for this reason (see this package's report).
   */
  series2Points?: string;
  series1Label: string;
  series2Label?: string;
  className?: string;
}

export function ForecastChart({
  series1Points,
  series2Points,
  series1Label,
  series2Label,
  className,
}: ForecastChartProps) {
  const hasSecondSeries = Boolean(series2Points && series2Label);

  return (
    <Card radius="lg" border="hairline" className={cn('p-4', className)}>
      <svg width="100%" height="90" viewBox="0 0 400 90" preserveAspectRatio="none">
        <polyline points={series1Points} fill="none" stroke="rgb(var(--info))" strokeWidth={2} />
        {hasSecondSeries ? (
          <polyline
            points={series2Points}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5 font-mono" style={{ fontSize: '11px', color: 'rgb(var(--text-3))' }}>
          <span
            className="inline-block"
            style={{ width: '10px', height: '2px', background: 'rgb(var(--info))' }}
          />
          {series1Label}
        </div>
        {hasSecondSeries ? (
          <div className="flex items-center gap-1.5 font-mono" style={{ fontSize: '11px', color: 'rgb(var(--text-3))' }}>
            <span
              className="inline-block"
              style={{ width: '10px', height: '2px', background: 'rgb(var(--accent))' }}
            />
            {series2Label}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
