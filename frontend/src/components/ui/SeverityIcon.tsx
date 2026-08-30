import type { SVGProps } from 'react';
import { cn } from './cn';

/**
 * SeverityIcon — the warning triangle used by alert rows.
 *
 * Verbatim from ChatWithCanvas.dc.html / Mobile.dc.html:
 *   bad   <svg width=14 height=14 viewBox="0 0 24 24" fill="var(--bad)"  stroke="var(--bad)"  stroke-width="1"   stroke-linejoin="round">
 *   warn  <svg width=14 height=14 viewBox="0 0 24 24" fill="none"        stroke="var(--warn)" stroke-width="1.4" stroke-linejoin="round">
 *   path  d="M12 3l9 16H3z"
 *
 * `good` and `info` DO NOT APPEAR in any mockup. They extrapolate the same rule the two real ones follow
 * — solid fill for "act now", outline for "be aware" — so both render as outlines at strokeWidth 1.4.
 * Treat them as unverified against source.
 */
export type Severity = 'bad' | 'warn' | 'good' | 'info';

export interface SeverityIconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> {
  severity: Severity;
  /** Rendered box in px. 14 everywhere in the mockups. */
  size?: number;
}

const SEVERITY_PAINT: Record<Severity, { fill: string; stroke: string; strokeWidth: number }> = {
  bad: { fill: 'rgb(var(--bad))', stroke: 'rgb(var(--bad))', strokeWidth: 1 },
  warn: { fill: 'none', stroke: 'rgb(var(--warn))', strokeWidth: 1.4 },
  // Unverified extrapolations — no mockup shows either of these.
  good: { fill: 'none', stroke: 'rgb(var(--good))', strokeWidth: 1.4 },
  info: { fill: 'none', stroke: 'rgb(var(--info))', strokeWidth: 1.4 },
};

export function SeverityIcon({ severity, size = 14, className, ...rest }: SeverityIconProps) {
  const paint = SEVERITY_PAINT[severity];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={paint.fill}
      stroke={paint.stroke}
      strokeWidth={paint.strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      <path d="M12 3l9 16H3z" />
    </svg>
  );
}
