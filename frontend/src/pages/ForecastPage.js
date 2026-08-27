import React, { useEffect, useRef, useState } from 'react';
import ForecastChart from '../components/ForecastChart';
import { createForecast, getForecastRun } from '../api/forecast';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';

const MODEL_OPTIONS = [
  { value: 'random_forest', label: 'Random forest' },
  { value: 'exponential_smoothing', label: 'Exponential smoothing' },
  { value: 'moving_average', label: 'Moving average' },
];

// Training now runs as a backend background task (POST /forecast returns
// immediately with status "pending"), so the page polls GET /forecast/{id}
// until it's no longer pending rather than expecting the result inline.
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

function ForecastPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [modelType, setModelType] = useState('random_forest');
  const [horizon, setHorizon] = useState(7);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  useEffect(() => {
    listProducts().then((data) => {
      setProducts(data);
      if (data.length > 0) setProductId(String(data[0].id));
    });
    listWarehouses().then((data) => {
      setWarehouses(data);
      if (data.length > 0) setWarehouseId(String(data[0].id));
    });
  }, []);

  const pollUntilDone = async (runId) => {
    const startedAt = Date.now();
    setStatusMessage('Training model…');
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      // eslint-disable-next-line no-await-in-loop
      const run = await getForecastRun(runId);
      if (cancelledRef.current) return;
      if (run.status === 'completed') {
        setResult(run);
        setStatusMessage(null);
        return;
      }
      if (run.status === 'failed') {
        setError('Forecast training failed — check the backend logs for this run.');
        setStatusMessage(null);
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
    if (!cancelledRef.current) {
      setError('Forecast is taking longer than expected — check back on this page shortly.');
      setStatusMessage(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const pendingRun = await createForecast({
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        modelType,
        forecastHorizon: Number(horizon),
      });
      await pollUntilDone(pendingRun.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Forecast failed.');
      setResult(null);
      setStatusMessage(null);
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Forecast</h1>
      <p>Predicts real future days ahead for one product in one warehouse, trained on its sales history.</p>

      <form className="forecast-form" onSubmit={handleSubmit}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku_code} — {p.name}
            </option>
          ))}
        </select>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select value={modelType} onChange={(e) => setModelType(e.target.value)}>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <label htmlFor="horizon">Days ahead</label>
        <input
          id="horizon"
          type="number"
          min="1"
          max="365"
          value={horizon}
          onChange={(e) => setHorizon(e.target.value)}
        />
        <button type="submit" disabled={isLoading || !productId || !warehouseId}>
          {isLoading ? 'Forecasting…' : 'Get forecast'}
        </button>
      </form>

      {statusMessage && <p className="hint">{statusMessage}</p>}
      {error && <p className="form-error">{error}</p>}
      {products.length === 0 && <p className="hint">Create a product and warehouse first.</p>}

      {result && (
        <div className="forecast-result">
          <p className="hint">
            Model: {result.model_type} · RMSE: {result.rmse != null ? result.rmse.toFixed(2) : '—'} · MAE:{' '}
            {result.mae != null ? result.mae.toFixed(2) : '—'}
          </p>
          <ForecastChart predictions={result.predictions} />
        </div>
      )}
    </div>
  );
}

export default ForecastPage;
