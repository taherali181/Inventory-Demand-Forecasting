import React, { useEffect, useState } from 'react';
import ForecastChart from '../components/ForecastChart';
import { createForecast } from '../api/forecast';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';

const MODEL_OPTIONS = [
  { value: 'random_forest', label: 'Random forest' },
  { value: 'exponential_smoothing', label: 'Exponential smoothing' },
  { value: 'moving_average', label: 'Moving average' },
];

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await createForecast({
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        modelType,
        forecastHorizon: Number(horizon),
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Forecast failed.');
      setResult(null);
    } finally {
      setIsLoading(false);
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
