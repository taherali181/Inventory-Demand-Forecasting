import React from 'react';
import { cn } from './cn';

const CONTROL_BASE =
  'w-full rounded-md border border-hairline bg-surface-2 text-content placeholder:text-content-muted ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
};

export const Input = React.forwardRef(function Input(
  { className, size = 'md', invalid = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, SIZES[size], invalid && 'border-status-bad', className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef(function Select(
  { className, size = 'md', invalid = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, SIZES[size], 'pr-8', invalid && 'border-status-bad', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef(function Textarea({ className, invalid = false, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'min-h-[80px] py-2 px-3 text-sm resize-y', invalid && 'border-status-bad', className)}
      {...props}
    />
  );
});

/**
 * Label + control + hint/error, with htmlFor and aria-describedby wired up.
 *
 * `srOnlyLabel` keeps the label in the DOM but visually hidden — the compact
 * inline forms need that, and the page tests resolve inputs by label text.
 */
export function Field({ id, label, hint, error, srOnlyLabel = false, className, children }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          srOnlyLabel ? 'sr-only' : 'text-xs font-medium text-content-secondary'
        )}
      >
        {label}
      </label>

      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id,
            'aria-describedby': describedBy,
            invalid: Boolean(error) || children.props.invalid,
          })
        : children}

      {error ? (
        <p id={`${id}-error`} className="text-xs text-status-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-content-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Inline error text, matching the legacy `.form-error` role. */
export function FormError({ children, className }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn('text-xs text-status-bad', className)}>
      {children}
    </p>
  );
}
