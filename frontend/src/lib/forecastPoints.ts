import type { ForecastPredictionRead } from '../api/types';

/**
 * Maps a forecast run's real predictions onto `ForecastChart`'s `viewBox="0 0 400 90"` SVG coordinate
 * space (see `components/canvas/widgets/ForecastChart.tsx`) — replaces the mockup's hand-picked sample
 * `points` strings with real values, honestly scaled (never fabricated).
 *
 * `yMin`/`yMax` are shared across every series being plotted together (computed by
 * `sharedPredictedSalesRange` below) so two runs land on the same vertical scale, matching the mockup's two
 * comparable polylines. A flat/constant series (yMin === yMax) is drawn as a horizontal line at mid-height
 * rather than dividing by zero.
 */
export function predictionsToPoints(
  predictions: ForecastPredictionRead[],
  yMin: number,
  yMax: number,
  width = 400,
  height = 90,
  margin = 6
): string {
  if (predictions.length === 0) return '';
  const usableHeight = height - margin * 2;
  const range = yMax - yMin;

  return predictions
    .map((prediction, index) => {
      const x = predictions.length === 1 ? 0 : (index / (predictions.length - 1)) * width;
      const normalized = range === 0 ? 0.5 : (prediction.predicted_sales - yMin) / range;
      const y = height - margin - normalized * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function sharedPredictedSalesRange(
  seriesList: ForecastPredictionRead[][]
): { min: number; max: number } {
  const values = seriesList.flat().map((p) => p.predicted_sales);
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

const MODEL_TYPE_LABELS: Record<string, string> = {
  moving_average: 'Moving average',
  random_forest: 'Random forest',
  exponential_smoothing: 'Exp. smoothing',
};

export function modelTypeLabel(modelType: string): string {
  return MODEL_TYPE_LABELS[modelType] ?? modelType;
}
