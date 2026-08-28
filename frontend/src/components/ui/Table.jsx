import React from 'react';
import { cn } from './cn';

/*
 * Presentational table shell. DataTable.js composes these and keeps its own
 * public props ({columns, rows, rowKey, emptyMessage}) unchanged — ten pages
 * and ProductsPage.test.js depend on that shape.
 *
 * No backdrop-filter anywhere here on purpose: this is the one surface that
 * actually scrolls with hundreds of rows.
 */

export function TableScroll({ className, children }) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-hairline bg-surface',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }) {
  return (
    <table className={cn('w-full border-collapse text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function Th({ className, children, align = 'left', numeric = false, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 whitespace-nowrap bg-surface-2 px-4 py-2.5',
        'text-xs font-semibold uppercase tracking-wider text-content-muted',
        'border-b border-hairline',
        numeric ? 'text-right' : `text-${align}`,
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, numeric = false, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 align-middle text-content-secondary',
        'border-b border-hairline',
        numeric && 'text-right tabular-nums',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({ className, children, ...props }) {
  return (
    <tr
      className={cn('transition-colors duration-100 hover:bg-surface-2 last:[&>td]:border-b-0', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

/** The action-button cluster that list pages inject via a column `render`. */
export function RowActions({ className, children }) {
  return <div className={cn('flex items-center justify-end gap-1.5', className)}>{children}</div>;
}
