import { cn } from '../ui';

/**
 * QuickPromptChips — Layer 2 chat surface primitive. Only shown before a conversation starts
 * (Main.dc.html) — that timing decision belongs to Layer 4, this component just renders whatever
 * `prompts` it's given.
 *
 * Verbatim from Main.dc.html:
 *   container  width:720px; display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;
 *   .chip      already defined in index.css (padding:9px 14px; border:1px solid var(--border);
 *              border-radius:var(--r-md); font-size:13px; color:var(--text-2); white-space:nowrap).
 *
 * The source markup uses plain `<div class="chip">` (non-interactive elements), but these chips exist to
 * be clicked (each one deterministically maps to a scripted reply, per the design brief's interaction
 * model) — rendered here as real `<button type="button">`s carrying the same `.chip` class so the pixel
 * output is identical while the element is actually operable. `width:720px` is an exact value the source
 * sets on this specific div (not inherited from a wider parent), so it's kept as this component's own
 * intrinsic style rather than left to the caller's layout.
 */

export interface QuickPromptChipsProps {
  prompts: string[];
  onSelect?: (prompt: string) => void;
  className?: string;
}

export function QuickPromptChips({ prompts, onSelect, className }: QuickPromptChipsProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      style={{ width: 720, marginBottom: 14 }}
    >
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="chip cursor-pointer"
          onClick={() => onSelect?.(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
