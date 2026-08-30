import { Button, Card, cn } from '../../ui';

/**
 * ReorderCard — Layer 3 Group A. ChatWithCanvas.dc.html's reorder-suggestion card, verbatim:
 *
 *   card    border:1px solid var(--border-strong); background:var(--surface); border-radius:var(--r-lg);
 *           padding:14px; display:flex; align-items:center; justify-content:space-between.
 *           -> `Card radius="lg" border="strong"` + `flex items-center justify-between p-3.5` (p-3.5 =
 *           14px on Tailwind's default scale).
 *   left    title  font-size:13.5px; font-weight:600.  ("Widget A → Acme Corp")
 *           meta   font-size:12px; color:var(--text-3); margin-top:2px; font-family:mono.
 *                  ("Suggested qty: 120 units · lead time 14 days")
 *   right   ghost-accent Button — border:1px solid {{accent}}; background:transparent; color:{{accent}};
 *           font-weight:700; font-size:12.5px; padding:7px 12px; border-radius:var(--r-sm) — exactly the
 *           `Button` primitive's `ghost-accent` variant defaults (no overrides needed). ROUNDED, never
 *           notched — the notch is reserved for solid-fill buttons only ("Create PO" in the mockup).
 *
 * All copy (title, meta, CTA label) is prop-driven — see ../sampleData.ts for the mockup's exact values.
 */

export interface ReorderCardProps {
  title: string;
  meta: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  className?: string;
}

export function ReorderCard({ title, meta, ctaLabel, onCtaClick, className }: ReorderCardProps) {
  return (
    <Card radius="lg" border="strong" className={cn('flex items-center justify-between p-3.5', className)}>
      <div>
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{title}</div>
        <div className="font-mono" style={{ fontSize: '12px', color: 'rgb(var(--text-3))', marginTop: '2px' }}>
          {meta}
        </div>
      </div>
      <Button variant="ghost-accent" onClick={onCtaClick}>
        {ctaLabel}
      </Button>
    </Card>
  );
}
