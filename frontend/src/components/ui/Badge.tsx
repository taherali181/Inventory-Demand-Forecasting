import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Badge family — Kbd, CountPill, DraftLabel. All three are one-line primitives with exact source values.
 */

/* ------------------------------------------------------------------------------------------------ */

/**
 * Kbd — keyboard-hint chip.
 *
 * `default` (CommandPalette `.kbd`):
 *   font-size:11px; font-family:mono; color:--text-3; border:1px solid --border-strong;
 *   border-radius:--r-sm; padding:1px 6px;
 *
 * `hint` (Main's header ⌘K chip — a genuinely different treatment in the source, NOT the same chip):
 *   font-size:11px; font-family:mono; color:--text-3; border:1px solid --border (the WEAK hairline);
 *   border-radius:--r-sm; padding:3px 8px;
 *
 * Both live in the `.kbd` / `.kbd--hint` classes in index.css so the values have one home.
 */
export interface KbdProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'hint';
}

export function Kbd({ variant = 'default', className, ...rest }: KbdProps) {
  return <span className={cn('kbd', variant === 'hint' && 'kbd--hint', className)} {...rest} />;
}

/* ------------------------------------------------------------------------------------------------ */

/**
 * CountPill — POKanban's `.count`:
 *   font-size:10.5px; font-family:mono; color:--text-3; background:--surface-2;
 *   border-radius:999px; padding:1px 7px;
 */
export type CountPillProps = HTMLAttributes<HTMLElement>;

export function CountPill({ className, ...rest }: CountPillProps) {
  return <span className={cn('count-pill', className)} {...rest} />;
}

/* ------------------------------------------------------------------------------------------------ */

/**
 * DraftLabel — ChatWithCanvas's "DRAFT" marker.
 *
 * BARE TEXT, NO CHIP BACKGROUND (design brief — do not wrap it in a pill):
 *   font-size:10.5px; color:{{accent}}; font-family:mono; letter-spacing:.05em;
 *
 * Note the source does NOT set text-transform — the string is already uppercase in the markup.
 */
export interface DraftLabelProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function DraftLabel({ children = 'DRAFT', className, ...rest }: DraftLabelProps) {
  return (
    <span
      className={cn('font-mono text-[10.5px] tracking-[0.05em] text-accent', className)}
      {...rest}
    >
      {children}
    </span>
  );
}
