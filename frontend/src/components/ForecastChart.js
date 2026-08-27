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

function ForecastChart({ predictions }) {
  if (!predictions || predictions.length === 0) return null;

  const data = {
    labels: predictions.map((_, index) => `#${index + 1}`),
    datasets: [
      {
        label: 'Predicted sales',
        data: predictions,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Forecast predictions' },
    },
  };

  return <Line data={data} options={options} />;
}

export default ForecastChart;
