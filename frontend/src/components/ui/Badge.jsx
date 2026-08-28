import React from 'react';
import { cn } from './cn';

// Tinted backgrounds use opacity modifiers, which work because the tokens are
// stored as RGB channels — see the note in tailwind.config.js.
const VARIANTS = {
  neutral: 'bg-surface-2 text-content-secondary border-hairline',
  accent: 'bg-accent/10 text-accent border-accent/25',
  good: 'bg-status-good/10 text-status-good border-status-good/25',
  warn: 'bg-status-warn/10 text-status-warn border-status-warn/25',
  bad: 'bg-status-bad/10 text-status-bad border-status-bad/25',
  info: 'bg-status-info/10 text-status-info border-status-info/25',
};

export function Badge({ variant = 'neutral', className, children, dot = false, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-xs font-medium whitespace-nowrap',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/*
 * Maps the backend's vocabulary onto badge variants in one place, so a status
 * string renders identically everywhere it appears.
 *
 * Values verified against backend/models.py — PurchaseOrderStatus (153-158),
 * AlertStatus (286-289), ForecastStatus (222-225), UserRole (28-30), and
 * Alert.alert_type (298, a free String defaulting to "low_stock").
 * Anything unmapped falls through to 'neutral' rather than throwing.
 */
const STATUS_VARIANTS = {
  // PurchaseOrderStatus
  draft: 'neutral',
  submitted: 'info',
  approved: 'info',
  partially_received: 'warn',
  received: 'good',
  cancelled: 'neutral',
  // AlertStatus
  open: 'bad',
  acknowledged: 'warn',
  resolved: 'good',
  // Alert.alert_type
  low_stock: 'warn',
  out_of_stock: 'bad',
  // ForecastStatus / UploadHistory.status
  pending: 'info',
  processing: 'info',
  completed: 'good',
  failed: 'bad',
  // UserRole
  admin: 'accent',
  staff: 'neutral',
};

export function StatusBadge({ status, className }) {
  if (status == null) return null;
  const key = String(status).toLowerCase();
  const label = String(status).replace(/_/g, ' ');
  return (
    <Badge variant={STATUS_VARIANTS[key] ?? 'neutral'} dot className={cn('capitalize', className)}>
      {label}
    </Badge>
  );
}
