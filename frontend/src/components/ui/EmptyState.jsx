import React from 'react';
import { cn } from './cn';

/**
 * Empty state for a list or panel with nothing to show.
 *
 * `message` renders as plain text so callers can keep passing the exact copy
 * their tests assert on (e.g. DataTable's default "No records yet.").
 */
export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-surface-2 text-content-muted">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      {title && <p className="text-sm font-medium text-content">{title}</p>}
      {message && <p className="max-w-sm text-xs text-content-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
