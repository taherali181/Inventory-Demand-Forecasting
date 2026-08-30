import type { Severity } from '../../ui';

/**
 * sampleData — the exact copy/values from ChatWithCanvas.dc.html's canvas panel (lines ~119-169). Used by
 * the preview harness and available for Package 5 to reuse verbatim for the composed screen's mock state.
 * None of this lives inside the widget components themselves (design brief: data-driven, no hardcoded
 * copy) — this file is the single source for it.
 */

export interface SampleAlert {
  severity: Severity;
  title: string;
  meta: string;
}

export const sampleAlerts: SampleAlert[] = [
  { severity: 'bad', title: 'Widget A — SKU-1042', meta: '12 units left · reorder pt 50 · Main Warehouse' },
  { severity: 'warn', title: 'Bracket Set — SKU-0871', meta: '31 units left · reorder pt 40 · East DC' },
  { severity: 'bad', title: 'Panel Clip — SKU-2210', meta: '4 units left · reorder pt 25 · Main Warehouse' },
];

export const sampleReorderSuggestion = {
  title: 'Widget A → Acme Corp',
  meta: 'Suggested qty: 120 units · lead time 14 days',
  ctaLabel: 'Create PO',
};

export const sampleForecast = {
  sectionLabel: 'Forecast — SKU-1042, next 30 days',
  series1Points: '0,60 40,55 80,58 120,42 160,48 200,30 240,36 280,20 320,26 360,14 400,18',
  series2Points: '0,65 40,62 80,64 120,60 160,55 200,52 240,50 280,44 320,40 360,38 400,34',
  series1Label: 'Random forest',
  series2Label: 'Exp. smoothing',
};

export const sampleAlertsSectionLabel = 'Open alerts';
export const sampleReorderSectionLabel = 'Reorder suggestion';
