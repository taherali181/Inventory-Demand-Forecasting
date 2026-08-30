import { cn } from '../ui';

/**
 * UserBubble — Layer 2 chat surface primitive.
 *
 * Verbatim from the source (ChatWithCanvas.dc.html desktop / Mobile.dc.html):
 *
 *   wrapper  display:flex; justify-content:flex-end;
 *   bubble   background:var(--surface-2);
 *            border-radius:var(--r-lg) var(--r-lg) 2px var(--r-lg);  (asymmetric — every corner rounded
 *              except a sharp 2px bottom-right; the 2px is a real, deliberate source value, not a token,
 *              so it's kept as a literal `border-radius` shorthand rather than approximated via a Tailwind
 *              radius utility)
 *
 *   desktop  max-width:420px; padding:12px 16px; font-size:14.5px; line-height:1.55;
 *   mobile   max-width:240px; padding:10px 13px; font-size:13.5px; line-height:1.5;
 *
 * `text` is a required prop — the mockup's own copy ("What needs reordering this week…") is never
 * hardcoded here; callers (the scripted-response table, or this package's preview harness) supply it.
 */

const SIZE_BY_VARIANT = {
  desktop: { maxWidth: 420, padding: '12px 16px', fontSize: '14.5px', lineHeight: 1.55 },
  mobile: { maxWidth: 240, padding: '10px 13px', fontSize: '13.5px', lineHeight: 1.5 },
} as const;

export interface UserBubbleProps {
  text: string;
  /** Which screen's sizing to use. Default 'desktop'. */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function UserBubble({ text, variant = 'desktop', className }: UserBubbleProps) {
  const size = SIZE_BY_VARIANT[variant];

  return (
    <div className={cn('flex justify-end', className)}>
      <div
        className="bg-surface-2 font-sans"
        style={{
          maxWidth: size.maxWidth,
          padding: size.padding,
          fontSize: size.fontSize,
          lineHeight: size.lineHeight,
          borderRadius: 'var(--r-lg) var(--r-lg) 2px var(--r-lg)',
        }}
      >
        {text}
      </div>
    </div>
  );
}
