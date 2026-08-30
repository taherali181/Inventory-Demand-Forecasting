import type { ReactNode } from 'react';
import { Button, Card, DraftLabel, cn } from '../ui';

/**
 * ConfirmActionCard — Layer 2 chat surface primitive. The canonical pattern for "the assistant wants to
 * write data, confirm first" (design brief). Verbatim from ChatWithCanvas.dc.html:
 *
 *   card    border:1px solid var(--border-strong) (STRONGER than a normal card's hairline);
 *           background:var(--surface); border-radius:var(--r-lg); padding:16px;
 *           display:flex; flex-direction:column; gap:12px; max-width:460px.
 *   header  display:flex; align-items:center; justify-content:space-between;
 *           title  font-size:13px; font-weight:600.
 *           <DraftLabel/> (bare text, no chip background — see Layer 0's Badge.tsx) — always exactly
 *           "DRAFT" per source; not exposed as a variable prop since it's an invariant status marker, not
 *           mockup copy.
 *   body    font-size:13px; color:var(--text-2); line-height:1.6; font-family:mono.
 *   footer  display:flex; gap:8px; margin-top:2px;
 *           primary Button   flex:1, padding:9px, fontSize:13, notch:9 — "Review & create" in the mockup.
 *           secondary Button padding:9px 14px, fontSize:13, className="text-content-secondary" — "Dismiss".
 *
 * `title`, `body`, `primaryLabel`, `secondaryLabel` are all required props — none of the mockup's own copy
 * ("Create purchase order", "Acme Corp · Main Warehouse<br>3 line items · est. $1,240.00", "Review &
 * create", "Dismiss") is hardcoded here.
 */

export interface ConfirmActionCardProps {
  title: string;
  /** ReactNode so the source's `<br>` line break between the two body lines round-trips. */
  body: ReactNode;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  className?: string;
}

export function ConfirmActionCard({
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimaryClick,
  onSecondaryClick,
  className,
}: ConfirmActionCardProps) {
  return (
    <Card
      radius="lg"
      border="strong"
      className={cn('flex flex-col gap-3 p-4', className)}
      style={{ maxWidth: 460 }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <DraftLabel />
      </div>

      <div
        className="font-mono"
        style={{ fontSize: 13, color: 'rgb(var(--text-2))', lineHeight: 1.6 }}
      >
        {body}
      </div>

      <div className="flex gap-2" style={{ marginTop: 2 }}>
        <Button
          variant="primary"
          padding="9px"
          fontSize={13}
          notch={9}
          className="flex-1"
          onClick={onPrimaryClick}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="secondary"
          padding="9px 14px"
          fontSize={13}
          className="text-content-secondary"
          onClick={onSecondaryClick}
        >
          {secondaryLabel}
        </Button>
      </div>
    </Card>
  );
}
