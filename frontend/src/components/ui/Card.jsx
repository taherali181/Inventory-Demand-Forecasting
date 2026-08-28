import React from 'react';
import { cn } from './cn';

/*
 * Opaque on purpose. The floating chrome (topbar, sidebar, command palette,
 * modals) uses .glass; cards do not, because backdrop-filter on every card in a
 * long scrolling list is a real compositing cost for no visual gain — a card
 * sits on a flat page background, so there is nothing interesting to blur.
 */
export function Card({ className, children, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-hairline bg-surface shadow-sm',
        interactive &&
          'transition-colors duration-150 hover:border-hairline-strong hover:bg-surface-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, as: Tag = 'h3', ...props }) {
  return (
    <Tag className={cn('text-sm font-semibold tracking-tight text-content', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-xs text-content-muted mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-hairline px-5 py-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** The KPI tile used across the dashboard and studio views. */
export function StatCard({ label, value, delta, trend, className }) {
  const trendColor =
    trend === 'up' ? 'text-status-good' : trend === 'down' ? 'text-status-bad' : 'text-content-muted';
  return (
    <Card className={cn('p-5', className)}>
      <div className="text-xs font-medium uppercase tracking-wider text-content-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-content tabular-nums">
        {value}
      </div>
      {delta != null && (
        <div className={cn('mt-1 text-xs font-medium tabular-nums', trendColor)}>{delta}</div>
      )}
    </Card>
  );
}
