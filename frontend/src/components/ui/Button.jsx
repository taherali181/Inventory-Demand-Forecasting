import React from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

/*
 * Every button in the app funnels through here.
 *
 * Note the explicit `bg-*` on every variant including ghost/link — the legacy
 * App.css shipped a bare `button { background:#2563eb }` rule that turned any
 * un-backgrounded button into a cobalt pill. That rule is gone, but keeping the
 * background explicit means this component cannot regress if a stray global
 * element rule ever reappears.
 */

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg border-transparent hover:bg-accent-hover active:bg-accent-active shadow-sm',
  secondary:
    'bg-surface text-content border-hairline hover:bg-surface-2 hover:border-hairline-strong shadow-sm',
  ghost:
    'bg-transparent text-content-secondary border-transparent hover:bg-surface-2 hover:text-content',
  danger:
    'bg-status-bad text-white border-transparent hover:opacity-90 active:opacity-80 shadow-sm',
  link:
    'bg-transparent text-accent border-transparent hover:text-accent-hover hover:underline underline-offset-4 shadow-none px-0',
};

// rounded-md is the 8px control radius (cards use rounded-lg / 12px).
const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

const ICON_SIZES = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-11 w-11' };

export const Button = React.forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconOnly = false,
    iconLeft = null,
    iconRight = null,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center border font-medium whitespace-nowrap',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        SIZES[size],
        iconOnly && cn(ICON_SIZES[size], 'px-0'),
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});
