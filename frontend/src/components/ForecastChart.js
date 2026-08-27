import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  Legend,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SERIES_COLORS = ['#2563eb', '#16a34a', '#dc2626'];

/**
 * Renders one forecast's predictions (`predictions` prop, the original
 * behavior), or overlays several runs side by side (`runs` prop: an array
 * of `{ label, predictions }`) — used by ForecastPage's model-comparison
 * toggle (Change 11.9). Different runs can cover different forecast dates
 * (e.g. trained at different times), so the x-axis is the union of every
 * date across all series, and a series with no prediction for a given date
 * just leaves a gap there rather than plotting a 0.
 */
function ForecastChart({ predictions, runs }) {
  const series = runs && runs.length > 0 ? runs : predictions ? [{ label: 'Predicted sales', predictions }] : [];
  if (series.length === 0) return null;

  const allDates = Array.from(new Set(series.flatMap((s) => s.predictions.map((p) => p.forecast_date)))).sort();

  const data = {
    labels: allDates,
    datasets: series.map((s, i) => {
      const byDate = Object.fromEntries(s.predictions.map((p) => [p.forecast_date, p.predicted_sales]));
      return {
        label: s.label,
        data: allDates.map((d) => (d in byDate ? byDate[d] : null)),
        borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        spanGaps: false,
        tension: 0.25,
      };
    }),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Forecast: predicted future sales' },
    },
  };

  return <Line data={data} options={options} />;
}

export default ForecastChart;
