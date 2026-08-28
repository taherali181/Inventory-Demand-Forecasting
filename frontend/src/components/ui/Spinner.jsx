import React from 'react';
import { cn } from './cn';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <svg
      className={cn('animate-spin h-4 w-4 shrink-0', className)}
      viewBox="0 0 16 16"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Block-level loading state for a panel or table that has nothing to show yet. */
export function LoadingBlock({ label = 'Loading…', className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-12 text-sm text-content-muted',
        className
      )}
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div
      className={cn('shimmer rounded-lg bg-surface-2', className)}
      aria-hidden="true"
    />
  );
}
