import { useState } from 'react';
import type { FormEvent } from 'react';
import { Card, IconButton, cn } from '../ui';

/**
 * ChatInputDock — Layer 2 chat surface primitive. Two GENUINELY different variants (same "don't collapse
 * into one component with incidental props" rule TopHeader follows) — one component, an explicit
 * discriminated `variant` prop, no shared default that happens to work for both.
 *
 * `home` (Main.dc.html):
 *   dock     width:720px; background:var(--surface); border:1px solid var(--border);
 *            border-radius:var(--r-lg); padding:8px 8px 8px 16px; display:flex; align-items:center;
 *            gap:10px;
 *   input    flex:1; font-size:14.5px; color:var(--text-3) (placeholder color — the source is a static
 *            span, this is a real `<input>`, see below).
 *   attach   32×32 rounded-md, transparent, color:var(--text-3), 17×17 paperclip glyph (exact path below).
 *   send     32×32 rounded-md, ACCENT-FILLED, color:#0D0D0D, 15×15 arrow glyph, stroke-width 2.
 *   caption  <p style="margin:10px 0 0;font-size:11px;font-family:mono;color:var(--text-3)">…</p>,
 *            rendered below the dock only for this variant.
 *   No outer wrapper padding is baked in here — Main.dc.html's shared `padding:0 24px 28px` container
 *   also holds the QuickPromptChips sibling above this dock, so that spacing is Layer 4's composition to
 *   own, not this component's.
 *
 * `followup` (ChatWithCanvas.dc.html):
 *   outer wrapper flex-shrink:0; padding:16px 20px 20px;  — UNLIKE `home`, the source pairs this wrapper
 *            directly with the dock spec as one unit (nothing else shares it), so it's rendered as this
 *            variant's own outermost element.
 *   dock     background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg);
 *            padding:8px 8px 8px 14px; display:flex; align-items:center; gap:10px; NO fixed width (fills
 *            the 600px chat column via the wrapper above).
 *   input    flex:1; font-size:13.5px; color:var(--text-3).
 *   send     28×28 rounded-md, `bg-surface-3` (NOT accent — the flagged, deliberate inconsistency; see the
 *            design brief's "Two flagged inconsistencies" section — build literally, do not unify with
 *            `home`'s accent-filled send button), color:var(--text-3), 14×14 arrow glyph, stroke-width 2.
 *   No caption below.
 *
 * `placeholder` is a required prop (no default) precisely so the mockup's own placeholder copy — "Ask
 * about stock, forecasts, suppliers, or orders…" / "Ask a follow-up…" — is never hardcoded inside this
 * component; the preview harness / Layer 4 supplies it. Same for `caption` on `home`.
 *
 * IMPLEMENTATION CHOICE: the source renders the placeholder as a static `<span>` (a non-functional mockup).
 * This component renders a real, functional `<input>` instead — its `placeholder`/font-size/color compute
 * identically to the mockup's span (verified: `placeholder:text-content-muted` = --text-3, same as the
 * span's `color:var(--text-3)`), and wrapping the dock in a `<form>` lets Enter and the send button both
 * fire `onSubmit`, which is the more honest interactive behavior for a chat input. State documented per
 * this package's report rather than silently decided.
 */

/** `<path d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7l9-9a3.5 3.5 0 015 5l-8.9 8.9a2 2 0 01-2.8-2.8l8-8"/>` — attach. */
function AttachGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7l9-9a3.5 3.5 0 015 5l-8.9 8.9a2 2 0 01-2.8-2.8l8-8" />
    </svg>
  );
}

/** `<path d="M12 19V5M5 12l7-7 7 7"/>`, stroke-width 2 — send (shared glyph, sized per variant). */
function SendGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

interface ChatInputDockBaseProps {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export interface ChatInputDockHomeProps extends ChatInputDockBaseProps {
  variant: 'home';
  /** 11px mono helper caption rendered below the dock. Omit to render none. */
  caption?: string;
  onAttach?: () => void;
}

export interface ChatInputDockFollowupProps extends ChatInputDockBaseProps {
  variant: 'followup';
}

export type ChatInputDockProps = ChatInputDockHomeProps | ChatInputDockFollowupProps;

export function ChatInputDock(props: ChatInputDockProps) {
  const { variant, placeholder, value, onChange, onSubmit, autoFocus, className } = props;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const currentValue = isControlled ? value : internalValue;

  function handleChange(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = currentValue.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    if (!isControlled) setInternalValue('');
  }

  const dock = (
    <form
      onSubmit={handleSubmit}
      className={variant === 'home' ? className : undefined}
      style={{ width: variant === 'home' ? 720 : undefined }}
    >
      <Card
        radius="lg"
        border="hairline"
        className="flex items-center gap-2.5"
        style={{
          padding: variant === 'home' ? '8px 8px 8px 16px' : '8px 8px 8px 14px',
        }}
      >
        <input
          type="text"
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 border-none bg-transparent font-sans text-content outline-none placeholder:text-content-muted"
          style={{ fontSize: variant === 'home' ? '14.5px' : '13.5px' }}
        />

        {variant === 'home' ? (
          <>
            <IconButton
              type="button"
              size={32}
              fill="none"
              aria-label="Attach"
              onClick={props.onAttach}
            >
              <AttachGlyph />
            </IconButton>
            <IconButton type="submit" size={32} fill="accent" aria-label="Send">
              <SendGlyph size={15} />
            </IconButton>
          </>
        ) : (
          <IconButton type="submit" size={28} fill="surface-3" aria-label="Send">
            <SendGlyph size={14} />
          </IconButton>
        )}
      </Card>
    </form>
  );

  if (variant === 'home') {
    return (
      <>
        {dock}
        {props.caption ? (
          <p
            className="font-mono"
            style={{ margin: '10px 0 0', fontSize: 11, color: 'rgb(var(--text-3))' }}
          >
            {props.caption}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className={cn(className)} style={{ flexShrink: 0, padding: '16px 20px 20px' }}>
      {dock}
    </div>
  );
}
