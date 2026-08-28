import React from 'react';
import { cn } from './cn';

/*
 * Geometric "R" monogram.
 *
 * Drawn on a 32x32 grid as a stroked centreline rather than a filled outline:
 * an even 3u stroke keeps the weight identical everywhere and stays legible at
 * favicon size, where a filled letterform's counter closes up into a blob.
 *
 * The tile takes `currentColor` so the mark can be recoloured by a parent
 * (accent in the sidebar, inherited ink on a printed surface). Geometry is kept
 * in step with public/favicon.svg and scripts/gen_icons.py — change one,
 * change all three.
 */

export function LogoMark({ className, title }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-7 w-7 shrink-0', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M11 8.5V23.5M11 8.5h4.5a3.75 3.75 0 0 1 0 7.5H11M14 16l5.5 7.5"
        fill="none"
        stroke="rgb(var(--accent-fg))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SIZES = {
  sm: { mark: 'h-6 w-6', text: 'text-sm' },
  md: { mark: 'h-7 w-7', text: 'text-[15px]' },
  lg: { mark: 'h-9 w-9', text: 'text-lg' },
};

/**
 * Full lock-up. `showWordmark={false}` gives the tile alone, for a collapsed
 * sidebar or a favicon-sized context.
 */
export function Logo({ size = 'md', showWordmark = true, className }) {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn(s.mark, 'text-accent')} title="Restock" />
      {showWordmark && (
        <span className={cn('font-semibold tracking-tight text-content', s.text)}>Restock</span>
      )}
    </span>
  );
}
