import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from './cn';
import { notchPolygon } from './notch';

/**
 * Button — Layer 0 primitive.
 *
 * Exact values traced to the mockup source (design-reference/mockups/*.dc.html):
 *
 *   primary  Login "Sign in"              padding:12px      notch:10px  font:14px/700
 *            ChatWithCanvas "Review & …"  padding:9px       notch:9px   font:13px/700
 *            POKanban "+ New PO"          padding:8px 14px  notch:8px   font:12.5px/700
 *   secondary Login "Continue with demo"  padding:11px      radius:md   font:13.5px/600  color:--text
 *            ChatWithCanvas "Dismiss"     padding:9px 14px  radius:md   font:13px/600    color:--text-2
 *   ghost-accent ChatWithCanvas "Create PO" padding:7px 12px radius:sm  font:12.5px/700  color:--accent
 *
 * The notch is NOT a constant — it tracks each button's own padding. That's why `notch`, `padding` and
 * `fontSize` are props applied via `style`: the mockup itself sets them inline per usage, and routing them
 * through `style` means a caller's `className` can never silently lose a Tailwind padding/text-size war.
 *
 * The notch belongs to SOLID FILLS ONLY. `secondary` and `ghost-accent` are plain rounded rectangles —
 * never clip-path them (design brief, "Fidelity checklist").
 *
 * `secondary` intentionally sets no text-color class so it inherits (`--text` via body). Pass
 * `className="text-content-secondary"` for the ChatWithCanvas "Dismiss" treatment.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost-accent';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant;
  /** Top-right clip-path notch, in px. `primary` only — ignored by the other variants. Default 9. */
  notch?: number;
  /** CSS `padding` shorthand. Defaults per variant; override per usage (see table above). */
  padding?: string;
  /** Font size in px (a number) or any CSS length (a string). Defaults per variant. */
  fontSize?: number | string;
  /** Escape hatch for anything not covered above; merged after the variant's own style. */
  style?: CSSProperties;
}

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap font-sans leading-none ' +
  'cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border-none bg-accent text-accent-fg font-bold hover:bg-accent/90',
  secondary:
    'rounded-md border border-hairline-strong bg-transparent font-semibold hover:bg-surface-2',
  'ghost-accent':
    'rounded-sm border border-accent bg-transparent text-accent font-bold hover:bg-accent/10',
};

const VARIANT_DEFAULTS: Record<ButtonVariant, { padding: string; fontSize: number }> = {
  primary: { padding: '9px', fontSize: 13 },
  secondary: { padding: '9px 14px', fontSize: 13 },
  'ghost-accent': { padding: '7px 12px', fontSize: 12.5 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', notch = 9, padding, fontSize, className, style, type, ...rest },
  ref
) {
  const defaults = VARIANT_DEFAULTS[variant];

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(BASE, VARIANT_CLASS[variant], className)}
      style={{
        padding: padding ?? defaults.padding,
        fontSize:
          typeof fontSize === 'number'
            ? `${fontSize}px`
            : (fontSize ?? `${defaults.fontSize}px`),
        ...(variant === 'primary' ? { clipPath: notchPolygon(notch) } : null),
        ...style,
      }}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------------------------------------ */

/**
 * IconButton — the 4th Button variant, split out because its sizing model is a square box, not padding.
 *
 * Source usages:
 *   Main attach icon                  32px  rounded-md  transparent  color:--text-3
 *   Main send icon                    32px  rounded-md  bg:--accent  color:#0D0D0D   (no notch — radius md)
 *   ChatWithCanvas follow-up send     28px  rounded-md  bg:--surface-3 color:--text-3
 *   ChatWithCanvas panel expand/close 28px  rounded-md  transparent  color:--text-3
 *
 * Note the accent-filled send button is `rounded-md`, NOT notched — the notch rule is for text CTAs.
 */
export type IconButtonFill = 'none' | 'accent' | 'surface-3';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Square box size in px. 28 or 32 in the mockups. Default 28. */
  size?: number;
  /** Background treatment. Default `'none'` (transparent). */
  fill?: IconButtonFill;
  /** Only meaningful with `fill="none"`: paints the glyph accent instead of muted. */
  active?: boolean;
  style?: CSSProperties;
}

/*
 * Mutually exclusive by construction: each entry owns the element's `bg-*` outright and the shared base
 * string below declares none. Do not move a `bg-*` up into the base — `cn` is a plain joiner, so two
 * background utilities on one element are resolved by Tailwind's emit order, not by argument order.
 *
 * The `surface-3` hover brightens the GLYPH rather than the fill: --surface-3 is the lightest surface
 * token there is, and the only lighter values in the token set are border colors, which must not be
 * painted as backgrounds.
 */
const FILL_CLASS: Record<IconButtonFill, string> = {
  none: 'bg-transparent hover:bg-surface-2',
  accent: 'bg-accent text-accent-fg hover:bg-accent/90',
  'surface-3': 'bg-surface-3 text-content-muted hover:text-content-secondary',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 28, fill = 'none', active = false, className, style, type, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border-none',
        'cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        FILL_CLASS[fill],
        fill === 'none' && (active ? 'text-accent' : 'text-content-muted hover:text-content-secondary'),
        className
      )}
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------------------------------------ */

/**
 * SegmentedToggle — the 5th Button variant. Source: POKanban's Kanban/List pill.
 *   container  bg:--surface-2  radius:--r-md  padding:2px
 *   segment    padding:6px 12px  radius:--r-sm  mono 11.5px/600
 *   active     bg:--surface-3 + full-strength text; inactive: color:--text-3
 */
export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  options: ReadonlyArray<SegmentedToggleOption<T>>;
  value: T;
  onChange?: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-md bg-surface-2 p-0.5', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(option.value)}
            /*
             * `bg-*` lives ONLY in the isActive branches — never also in the shared base string.
             * `cn` is a plain joiner, not tailwind-merge: if both `bg-transparent` and `bg-surface-3`
             * ship on the same element, Tailwind's own stylesheet order decides the winner (it emits
             * `.bg-surface-3` before `.bg-transparent`, so transparent wins) and the active chip
             * renders invisible. That was a real, shipped bug here — keep the branches exclusive.
             */
            className={cn(
              'cursor-pointer rounded-sm border-none px-3 py-1.5',
              'font-mono text-[11.5px] font-semibold leading-none transition-colors duration-150',
              isActive
                ? 'bg-surface-3 text-content'
                : 'bg-transparent text-content-muted hover:text-content-secondary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
