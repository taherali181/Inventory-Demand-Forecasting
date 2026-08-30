import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * LaserLine — the accent gradient rule. It exists in the source in TWO physically different forms:
 *
 * 1. As a BORDER on a header element (ChatWithCanvas's canvas header, POKanban's canvas header, the
 *    command palette's search row):
 *      border-bottom: 2px solid {{accent}};
 *      border-image: linear-gradient(90deg, transparent, rgba({{accentRgb}},.9), transparent) 1;
 *    Apply it by putting `laserLineBorder` (the `.laser-line` class in index.css) on that header itself —
 *    it is a border, so it cannot be a child element without changing the box model.
 *
 * 2. As a FILLED 2px DIV (Mobile's bottom sheet, between the drag handle and the sheet header):
 *      <div style="height:2px;margin:0 20px;background:linear-gradient(90deg,transparent,rgba(accent,.9),transparent)">
 *    That is what the `<LaserLine />` component below renders. Mobile insets it with `margin: 0 20px`;
 *    pass `className="mx-5"` for that.
 *
 * Scope rule (design brief, "Fidelity checklist"): form 1 appears ONLY on ChatWithCanvas's panel,
 * POKanban's panel, and the command palette. Form 2 appears ONLY on Mobile's bottom sheet.
 */

/** Class name for form 1 — put it on the header element whose bottom border should be the laser line. */
export const laserLineBorder = 'laser-line';

export type LaserLineProps = HTMLAttributes<HTMLDivElement>;

export function LaserLine({ className, style, ...rest }: LaserLineProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-0.5 shrink-0', className)}
      style={{
        background:
          'linear-gradient(90deg, transparent, rgb(var(--accent) / 0.9), transparent)',
        ...style,
      }}
      {...rest}
    />
  );
}
