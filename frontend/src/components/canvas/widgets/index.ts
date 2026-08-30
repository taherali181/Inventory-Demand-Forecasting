/**
 * Layer 3 Group A — ChatWithCanvas's docked canvas panel widgets. Everything here traces to an exact
 * value in design-reference/mockups/ChatWithCanvas.dc.html — see each file's header comment for the
 * source lines it came from.
 */

export { CanvasPanelHeader } from './CanvasPanelHeader';
export type { CanvasPanelHeaderProps, CanvasPanelTab } from './CanvasPanelHeader';

export { AlertRow } from './AlertRow';
export type { AlertRowProps } from './AlertRow';

export { ReorderCard } from './ReorderCard';
export type { ReorderCardProps } from './ReorderCard';

export { ForecastChart } from './ForecastChart';
export type { ForecastChartProps } from './ForecastChart';

export { CanvasWidgetsPanel } from './CanvasWidgetsPanel';
export type { CanvasWidgetsPanelProps } from './CanvasWidgetsPanel';

export {
  sampleAlerts,
  sampleReorderSuggestion,
  sampleForecast,
  sampleAlertsSectionLabel,
  sampleReorderSectionLabel,
} from './sampleData';
export type { SampleAlert } from './sampleData';
