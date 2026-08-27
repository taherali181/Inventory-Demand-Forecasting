import React, { useEffect, useRef, useState } from 'react';
import ForecastChart from '../components/ForecastChart';
import LoadMoreButton from '../components/LoadMoreButton';
import { createForecast, getForecastRun, listForecastRuns } from '../api/forecast';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';
import usePaginatedList from '../hooks/usePaginatedList';

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
  const [pastRunsError, setPastRunsError] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  useEffect(() => {
    listProducts().then((data) => {
      setProducts(data.items);
      if (data.items.length > 0) setProductId(String(data.items[0].id));
    });
    listWarehouses().then((data) => {
      setWarehouses(data.items);
      if (data.items.length > 0) setWarehouseId(String(data.items[0].id));
    });
  }, []);

  // Past runs for the currently-selected product/warehouse pair — lets a
  // user re-view an earlier run (getForecastRun re-reads it without
  // retraining) instead of only ever seeing the most recent submission's
  // result. Refetches whenever the selected product/warehouse changes.
  const {
    items: pastRuns,
    total: pastRunsTotal,
    isLoading: pastRunsLoading,
    reload: reloadPastRuns,
    loadMore: loadMorePastRuns,
    hasMore: pastRunsHasMore,
  } = usePaginatedList(
    ({ skip, limit }) =>
      listForecastRuns({
        productId: productId ? Number(productId) : undefined,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        skip,
        limit,
      }),
    [productId, warehouseId]
  );

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
        reloadPastRuns();
        return;
      }
      if (run.status === 'failed') {
        setError('Forecast training failed — check the backend logs for this run.');
        setStatusMessage(null);
        reloadPastRuns();
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

  const handleViewPastRun = async (runId) => {
    setPastRunsError(null);
    setError(null);
    try {
      const run = await getForecastRun(runId);
      setResult(run);
    } catch (err) {
      setPastRunsError(err.response?.data?.detail || 'Could not load that run.');
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

      {productId && warehouseId && (
        <div className="forecast-past-runs">
          <h2>Past runs</h2>
          {pastRunsError && <p className="form-error">{pastRunsError}</p>}
          {pastRunsLoading && pastRuns.length === 0 ? (
            <p>Loading…</p>
          ) : pastRuns.length === 0 ? (
            <p className="hint">No past runs for this product/warehouse yet.</p>
          ) : (
            <ul className="forecast-run-list">
              {pastRuns.map((run) => (
                <li key={run.id}>
                  <button type="button" onClick={() => handleViewPastRun(run.id)}>
                    #{run.id} · {run.model_type} · {run.status} · {new Date(run.trained_at).toLocaleString()}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <LoadMoreButton
            items={pastRuns}
            total={pastRunsTotal}
            hasMore={pastRunsHasMore}
            isLoading={pastRunsLoading}
            onLoadMore={loadMorePastRuns}
          />
        </div>
      )}
    </div>
  );
}

export default ForecastPage;
