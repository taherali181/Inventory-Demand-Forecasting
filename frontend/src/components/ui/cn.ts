/**
 * Minimal class-name joiner. Deliberately NOT a tailwind-merge — the primitives in this folder never
 * emit a Tailwind class for any value that varies per usage (padding, font-size, notch size, box size);
 * those go through `style` instead, exactly as the mockup source does. That keeps `className` free for
 * layout-only classes (`flex-1`, `w-full`, `self-start`) with zero utility-conflict ambiguity.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
