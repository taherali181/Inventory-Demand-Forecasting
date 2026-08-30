import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Card / Panel — Layer 0 primitive. `bg-surface` + a 1px hairline, radius chosen per usage.
 *
 * `radius` is REQUIRED on purpose. The mockups genuinely use two different values and defaulting to one
 * is exactly the kind of drift this rebuild exists to eliminate (design brief, Layer 0):
 *   lg (10px)  ChatWithCanvas ConfirmActionCard / ReorderCard / ForecastChart card
 *   md (6px)   POKanban `.po-card`, Main's `.stat` tile, the alert rows
 *
 * `border` picks the hairline weight — also genuinely two values in the source:
 *   hairline (--border #2C2C2C)         plain cards: forecast card, alert rows, stat tiles, po-cards
 *   strong   (--border-strong #454545)  ConfirmActionCard and the ReorderCard, which sit "one level up"
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  radius: 'sm' | 'md' | 'lg' | 'xl';
  border?: 'hairline' | 'strong';
}

const RADIUS_CLASS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
} as const;

const BORDER_CLASS = {
  hairline: 'border-hairline',
  strong: 'border-hairline-strong',
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { radius, border = 'hairline', className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-surface border',
        BORDER_CLASS[border],
        RADIUS_CLASS[radius],
        className
      )}
      {...rest}
    />
  );
});
