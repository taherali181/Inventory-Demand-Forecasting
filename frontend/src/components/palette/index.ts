/**
 * Layer 3 Group C — command palette. Everything here traces to an exact value in
 * design-reference/mockups/CommandPalette.dc.html — see each file's header comment for the source lines
 * it came from.
 */

export { PaletteRow } from './PaletteRow';
export type { PaletteRowProps } from './PaletteRow';

export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps, PaletteGroup, PaletteResultRow } from './CommandPalette';

export { PaletteOverlay, APP_ROOT_DIM_FILTER } from './PaletteOverlay';
export type { PaletteOverlayProps } from './PaletteOverlay';

export { paletteGroups, paletteQuery, defaultHighlightedId } from './sampleData';
