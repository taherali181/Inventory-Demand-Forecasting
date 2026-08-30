import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { PaletteGroup } from './CommandPalette';

/**
 * sampleData — CommandPalette.dc.html's exact groups/rows/query, transcribed verbatim (copy, ordering,
 * icon paths). Kept as a plain `.ts` file (not `.tsx`) per the package's file list, so the three row icons
 * below are built with `React.createElement` rather than JSX — functionally identical `ReactNode`s, just
 * without JSX syntax, which a `.ts` file can't parse.
 *
 * Icon props shared by all three (source: `width="14" height="14" viewBox="0 0 24 24" fill="none"
 * stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`).
 */
const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Supplier row icon — a truck: `M3 7h11v8H3z / M14 11h4l3 3v1h-7 / circle 7,18 r1.6 / circle 17.5,18 r1.6`. */
const supplierIcon: ReactNode = createElement(
  'svg',
  ICON_PROPS,
  createElement('path', { key: 'body', d: 'M3 7h11v8H3z' }),
  createElement('path', { key: 'cab', d: 'M14 11h4l3 3v1h-7' }),
  createElement('circle', { key: 'wheel-l', cx: 7, cy: 18, r: 1.6 }),
  createElement('circle', { key: 'wheel-r', cx: 17.5, cy: 18, r: 1.6 })
);

/** Purchase-order row icon — a document: `M6 2h9l5 5v15H6z / M15 2v5h5 / M9 13h6M9 17h6`. */
const purchaseOrderIcon: ReactNode = createElement(
  'svg',
  ICON_PROPS,
  createElement('path', { key: 'sheet', d: 'M6 2h9l5 5v15H6z' }),
  createElement('path', { key: 'fold', d: 'M15 2v5h5' }),
  createElement('path', { key: 'lines', d: 'M9 13h6M9 17h6' })
);

/** Product row icon — a box: `M21 8l-9-5-9 5 9 5 9-5z / M3 8v8l9 5 9-5V8 / M12 13v8`. */
const productIcon: ReactNode = createElement(
  'svg',
  ICON_PROPS,
  createElement('path', { key: 'lid', d: 'M21 8l-9-5-9 5 9 5 9-5z' }),
  createElement('path', { key: 'body', d: 'M3 8v8l9 5 9-5V8' }),
  createElement('path', { key: 'seam', d: 'M12 13v8' })
);

/** The mockup's query text — `<span>acme<span class="palette-caret">` (display-only, per the design brief). */
export const paletteQuery = 'acme';

export const paletteGroups: PaletteGroup[] = [
  {
    label: 'Suppliers',
    rows: [
      {
        id: 'supplier-acme-corp',
        icon: supplierIcon,
        title: 'Acme Corp',
        meta: 'Lead time 14 days · 2 late deliveries this month',
        // Literal source inconsistency — this meta is NOT mono, unlike the PO/Product rows below. See
        // PaletteRow.tsx's header comment and the package report.
        metaMono: false,
      },
    ],
  },
  {
    label: 'Purchase orders',
    rows: [
      {
        id: 'po-1041',
        icon: purchaseOrderIcon,
        title: 'PO-1041 — Acme Corp',
        meta: 'Approved · $940.00',
        metaMono: true,
      },
      {
        id: 'po-1028',
        icon: purchaseOrderIcon,
        title: 'PO-1028 — Acme Corp',
        meta: 'Received · $3,120.00',
        metaMono: true,
      },
    ],
  },
  {
    label: 'Products',
    rows: [
      {
        id: 'product-widget-a',
        icon: productIcon,
        title: 'Widget A',
        meta: 'SKU-1042 · default supplier: Acme Corp',
        metaMono: true,
      },
    ],
  },
];

/** The source highlights the Acme Corp supplier row (`.row` with the `background:var(--surface-2)` override). */
export const defaultHighlightedId = 'supplier-acme-corp';
