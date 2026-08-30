import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * AssistantMessage — Layer 2 chat surface primitive. No bubble — plain text directly on the canvas
 * background.
 *
 * Label row (verbatim, Main.dc.html / ChatWithCanvas.dc.html):
 *   display:flex; align-items:center; gap:8px;
 *   dot    width:5px; height:5px; background:#3E7BFA;  (SQUARE — no border-radius, never round)
 *   label  <span class="label" style="color:var(--text-2)">Restock</span>  — overrides `.label`'s default
 *          muted (--text-3) color to the slightly-brighter --text-2, on desktop only (see mobile below).
 *   time   <span style="font-size:11px;color:var(--text-3);font-family:mono">09:04</span>
 *
 * Mobile (Mobile.dc.html) differs in three ways, not just scale:
 *   - dot is 4px, label-row gap is 6px, outer gap is 8px (vs. 16/14 desktop)
 *   - label is a PLAIN `.label` (stays muted --text-3) — the color override above is NOT applied
 *   - no timestamp span appears in the mobile markup at all
 *
 * Body copy differs per screen and is exposed via `size`, not hardcoded:
 *   hero (Main's opening line)         20px / line-height 1.5 / font-weight 500 / color --text / max-width 560px
 *   body (ChatWithCanvas's reply)      14.5px / line-height 1.65 / max-width 480px (weight normal)
 *   Mobile's own body text is neither of the above (13.5px / line-height 1.55, no max-width, no weight
 *   override) — when `variant="mobile"`, that typography is used regardless of `size`, since no mobile
 *   mockup shows a "hero" assistant message to extrapolate from.
 *
 * Outer container gap is also genuinely different per screen (16 on Main, 14 on ChatWithCanvas, 8 on
 * Mobile) — exposed as a `gap` prop rather than baked in, per the design brief's explicit instruction.
 *
 * `timestamp` is optional and rendered only when passed (never on `variant="mobile"`, matching source).
 * The design brief asks that callers pass a timestamp on every assistant message for visual consistency —
 * that's guidance for how Layer 4 composes messages, not a rule this component enforces on its own.
 *
 * `children` is an optional slot for whatever rides below the paragraph in the source (the KPI stat grid on
 * Main's first message, a ConfirmActionCard on ChatWithCanvas's reply) — kept generic so any future
 * attachment type can reuse this component without a new prop per widget type.
 */

const BODY_TYPOGRAPHY = {
  hero: {
    fontSize: '20px',
    lineHeight: 1.5,
    fontWeight: 500,
    maxWidth: 560,
    color: 'rgb(var(--text))',
  },
  body: {
    fontSize: '14.5px',
    lineHeight: 1.65,
    fontWeight: 400,
    maxWidth: 480,
    color: 'rgb(var(--text))',
  },
  mobile: {
    fontSize: '13.5px',
    lineHeight: 1.55,
    fontWeight: 400,
    maxWidth: undefined,
    color: 'rgb(var(--text))',
  },
} as const;

export interface AssistantMessageProps {
  /** The paragraph body. Accepts ReactNode so inline emphasis (`<strong>Acme Corp</strong>`) round-trips. */
  text: ReactNode;
  /** Pre-formatted display string, e.g. "09:04". Omit to render no timestamp (always omitted on mobile). */
  timestamp?: string;
  /** Sender label text. Default "Restock" (the only value shown in any mockup). */
  senderLabel?: string;
  /** Which screen's body typography to use. Ignored (mobile typography always wins) when variant="mobile". */
  size?: 'hero' | 'body';
  /** Which screen's label-row/dot/gap treatment to use. Default 'desktop'. */
  variant?: 'desktop' | 'mobile';
  /** Outer flex-column gap in px. Default 16 (Main); pass 14 for ChatWithCanvas, 8 for Mobile. */
  gap?: number;
  /** Optional content rendered below the paragraph (KPIStatGrid, ConfirmActionCard, …). */
  children?: ReactNode;
  className?: string;
}

export function AssistantMessage({
  text,
  timestamp,
  senderLabel = 'Restock',
  size = 'body',
  variant = 'desktop',
  gap = 16,
  children,
  className,
}: AssistantMessageProps) {
  const isMobile = variant === 'mobile';
  const typography = isMobile ? BODY_TYPOGRAPHY.mobile : BODY_TYPOGRAPHY[size];
  const dotSize = isMobile ? 4 : 5;
  const labelRowGap = isMobile ? 6 : 8;

  return (
    <div className={cn('flex flex-col', className)} style={{ gap }}>
      <div className="flex items-center" style={{ gap: labelRowGap }}>
        <div
          style={{ width: dotSize, height: dotSize, background: 'rgb(var(--accent))', flexShrink: 0 }}
        />
        {isMobile ? (
          <span className="label">{senderLabel}</span>
        ) : (
          <span className="label" style={{ color: 'rgb(var(--text-2))' }}>
            {senderLabel}
          </span>
        )}
        {!isMobile && timestamp ? (
          <span className="font-mono" style={{ fontSize: 11, color: 'rgb(var(--text-3))' }}>
            {timestamp}
          </span>
        ) : null}
      </div>

      <p
        className="m-0 font-sans"
        style={{
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          fontWeight: typography.fontWeight,
          color: typography.color,
          maxWidth: typography.maxWidth,
        }}
      >
        {text}
      </p>

      {children}
    </div>
  );
}
