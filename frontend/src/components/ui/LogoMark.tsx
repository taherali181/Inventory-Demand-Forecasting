import type { HTMLAttributes } from 'react';
import { cn } from './cn';
import { notchPolygon } from './notch';

/**
 * LogoMark — the accent "R" tile with the same top-right clip-path notch the solid buttons use.
 *
 * Verbatim from the source:
 *   sm       24×24  notch 7px  font-size 12px   (Login.dc.html's brand row — the ONLY sm usage)
 *   default  30×30  notch 8px  font-size 14px   (the icon rail on Main / ChatWithCanvas / POKanban)
 *
 * Both: background:{{accent}}; color:#0D0D0D (= --accent-fg); font-family:mono; font-weight:700.
 */
export interface LogoMarkProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  size?: 'sm' | 'default';
}

const SIZES = {
  sm: { box: 24, notch: 7, fontSize: 12 },
  default: { box: 30, notch: 8, fontSize: 14 },
} as const;

export function LogoMark({ size = 'default', className, style, ...rest }: LogoMarkProps) {
  const { box, notch, fontSize } = SIZES[size];

  return (
    <div
      aria-label="Restock"
      role="img"
      className={cn(
        'flex shrink-0 items-center justify-center bg-accent font-mono font-bold text-accent-fg',
        className
      )}
      style={{
        width: `${box}px`,
        height: `${box}px`,
        fontSize: `${fontSize}px`,
        clipPath: notchPolygon(notch),
        ...style,
      }}
      {...rest}
    >
      R
    </div>
  );
}
