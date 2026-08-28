import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose class names, with later Tailwind utilities winning over earlier ones.
 *
 * twMerge is the part that matters: it lets a caller pass `className="px-8"` to
 * a component whose base is `px-4` and actually get px-8, instead of both
 * landing in the class list and the cascade picking by stylesheet order.
 *
 * Both deps were already in package.json with zero imports before this.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
