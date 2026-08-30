import { Card, SeverityIcon, cn } from '../../ui';
import type { Severity } from '../../ui';

/**
 * AlertRow — Layer 3 Group A. ChatWithCanvas.dc.html's `.alert-row`, verbatim:
 *
 *   row    display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border);
 *          border-radius:var(--r-md);
 *          — built on the `Card` primitive (`radius="md" border="hairline"`, matching --border/--r-md
 *          exactly) rather than a plain div, per the deliverable note. gap:10px -> `gap-2.5`;
 *          padding:10px 12px -> `py-2.5 px-3` (Tailwind's default spacing scale lands exactly on both,
 *          no arbitrary values needed).
 *   icon   <SeverityIcon severity=.../> at its 14px default size, flex-shrink:0 (SeverityIcon already
 *          applies `shrink-0`).
 *   title  <div style="font-size:13.5px;font-weight:600;">Widget A — SKU-1042</div>
 *   meta   <div style="font-size:12px;color:var(--text-3);font-family:var(--mono);">...</div>
 *          (no gap/margin between title and meta in the source — plain block stacking, reproduced as-is).
 *
 * Copy (title/meta text, severity) is entirely prop-driven — see ../sampleData.ts for the mockup's exact
 * three rows.
 */

export interface AlertRowProps {
  severity: Severity;
  title: string;
  meta: string;
  className?: string;
}

export function AlertRow({ severity, title, meta, className }: AlertRowProps) {
  return (
    <Card radius="md" border="hairline" className={cn('flex items-center gap-2.5 px-3 py-2.5', className)}>
      <SeverityIcon severity={severity} />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{title}</div>
        <div className="font-mono" style={{ fontSize: '12px', color: 'rgb(var(--text-3))' }}>
          {meta}
        </div>
      </div>
    </Card>
  );
}
