import { useState } from 'react';
import { PaletteOverlay, defaultHighlightedId, paletteGroups, paletteQuery } from '../components/palette';
import type { PaletteResultRow } from '../components/palette';
import { useShell } from '../components/shell';

/**
 * CommandPaletteRoot — Layer 4. Wires the Group C palette (sample rows verbatim from
 * CommandPalette.dc.html) to ShellContext: selecting a row is a scripted action (close the palette, then
 * open a plausible canvas view for that row's kind of result), matching the same
 * "deterministic canned response" interaction model as the chat quick-prompts. The query text stays
 * display-only, per the design brief and `CommandPalette`'s own header comment — there's no real search
 * happening, just the mockup's fixed "acme" string.
 */
export function CommandPaletteRoot() {
  const { dispatch } = useShell();
  const [highlightedId, setHighlightedId] = useState<string | null>(defaultHighlightedId);

  function handleSelect(row: PaletteResultRow) {
    if (row.id.startsWith('po-')) {
      dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'kanban' } });
    } else if (row.id.startsWith('product-')) {
      dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'widgets', tab: 'forecast' } });
    } else {
      // supplier rows
      dispatch({ type: 'OPEN_CANVAS', canvas: { mode: 'widgets', tab: 'alerts' } });
    }
    dispatch({ type: 'SET_PALETTE', open: false });
  }

  return (
    <PaletteOverlay
      query={paletteQuery}
      groups={paletteGroups}
      highlightedId={highlightedId}
      onHighlightChange={setHighlightedId}
      onSelect={handleSelect}
      onClose={() => dispatch({ type: 'SET_PALETTE', open: false })}
    />
  );
}
