import React from 'react';
import { cn } from './cn';

/**
 * The standard page/studio title block: title, optional subtitle, actions slot.
 *
 * `as` exists because App.test.js asserts a heading matching /dashboard/i, and
 * the studio views nest under the shell's own h1 — those render `as="h2"` so
 * the document keeps a sane heading order.
 */
export function PageHeader({ title, subtitle, actions, as: Tag = 'h1', className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <Tag className="text-lg font-semibold tracking-tight text-content">{title}</Tag>
        {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Consistent outer padding + vertical rhythm for a page body. */
export function PageBody({ className, children }) {
  return <div className={cn('mx-auto w-full max-w-7xl p-6 space-y-6', className)}>{children}</div>;
}
