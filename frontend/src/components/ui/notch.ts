/**
 * The angled top-right notch shared by every SOLID-FILL surface in the mockups: the primary buttons
 * (Login "Sign in", ChatWithCanvas "Review & create", POKanban "+ New PO") and the LogoMark tile.
 *
 * The polygon is verbatim from the source — e.g. Login.dc.html:
 *   clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)
 *
 * The notch size is NOT a constant. It tracks each usage's own padding / box size:
 *   Login "Sign in"      padding 12px      → notch 10px
 *   "Review & create"    padding 9px       → notch 9px
 *   "+ New PO"           padding 8px 14px  → notch 8px
 *   LogoMark sm          box 24px          → notch 7px
 *   LogoMark default     box 30px          → notch 8px
 *
 * Never apply it to an outline/ghost button — the notch is reserved for solid fills.
 */
export function notchPolygon(notch: number): string {
  return `polygon(0 0, calc(100% - ${notch}px) 0, 100% ${notch}px, 100% 100%, 0 100%)`;
}
