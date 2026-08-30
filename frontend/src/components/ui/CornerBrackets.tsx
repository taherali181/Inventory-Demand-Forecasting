import type { CSSProperties } from 'react';

/**
 * CornerBrackets — four 10×10px L-shaped accent corners.
 *
 * Verbatim from the source (`.bracket{position:absolute;width:10px;height:10px;pointer-events:none;}`
 * plus per-corner `border-top/-right/-bottom/-left:1.5px solid {{accent}}`):
 *   inset   top/left/right/bottom: 8px   — ChatWithCanvas's canvas panel, POKanban's canvas panel
 *   outset  top/left/right/bottom: -9px  — CommandPalette (floats OUTSIDE the palette's edge)
 *
 * THESE THREE SURFACES ARE THE ONLY PLACES THIS APPEARS ANYWHERE IN THE APP. Never add it to Login,
 * Main's header, the chat column, or Mobile. Swapping inset/outset between them is a fidelity fail
 * (design brief, "Fidelity checklist").
 *
 * The parent element must be `relative` (and, for `outset`, must not clip — i.e. `overflow-visible`).
 */
export interface CornerBracketsProps {
  mode: 'inset' | 'outset';
  /** Applied to every one of the four bracket divs — e.g. an opacity or transition class. */
  className?: string;
}

const ACCENT_EDGE = '1.5px solid rgb(var(--accent))';

const BOX: CSSProperties = {
  position: 'absolute',
  width: '10px',
  height: '10px',
  pointerEvents: 'none',
};

export function CornerBrackets({ mode, className }: CornerBracketsProps) {
  const offset = mode === 'inset' ? '8px' : '-9px';

  const corners: Array<{ key: string; style: CSSProperties }> = [
    { key: 'tl', style: { top: offset, left: offset, borderTop: ACCENT_EDGE, borderLeft: ACCENT_EDGE } },
    { key: 'tr', style: { top: offset, right: offset, borderTop: ACCENT_EDGE, borderRight: ACCENT_EDGE } },
    { key: 'bl', style: { bottom: offset, left: offset, borderBottom: ACCENT_EDGE, borderLeft: ACCENT_EDGE } },
    { key: 'br', style: { bottom: offset, right: offset, borderBottom: ACCENT_EDGE, borderRight: ACCENT_EDGE } },
  ];

  return (
    <>
      {corners.map(({ key, style }) => (
        <div key={key} aria-hidden="true" className={className} style={{ ...BOX, ...style }} />
      ))}
    </>
  );
}
