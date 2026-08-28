import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrendingUp, Play, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useChartTheme, chartAxisProps, chartGridProps, chartTooltipProps } from '../../charts/theme';
import * as forecastApi from '../../api/forecast';
import * as productsApi from '../../api/products';
import * as warehousesApi from '../../api/warehouses';
const MODEL_LABELS = {
  random_forest: 'Random Forest',
  exponential_smoothing: 'Exponential Smoothing (ETS)',
  moving_average: 'Moving Average',
};

const MODEL_COLORS = {
  random_forest: '#60a5fa',
  exponential_smoothing: '#34d399',
  moving_average: '#a1a1aa',
};

export const ForecastStudio = () => {
  const chart = useChartTheme();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('1');
  const [selectedWarehouse, setSelectedWarehouse] = useState('1');
  const [modelType, setModelType] = useState('random_forest');
  const [horizonDays, setHorizonDays] = useState(30);
  const [isTraining, setIsTraining] = useState(false);
  const [forecastStatus, setForecastStatus] = useState(null);
  const [compareRuns, setCompareRuns] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    productsApi
      .listProducts()
      .then((res) => {
        const items = res.items || res || [];
        setProducts(items);
        if (items.length > 0) {
          setSelectedProduct((prev) => (items.some((p) => String(p.id) === prev) ? prev : String(items[0].id)));
        }
      })
      .catch(() => {});
    warehousesApi
      .listWarehouses()
      .then((res) => {
        const items = res.items || res || [];
        setWarehouses(items);
        if (items.length > 0) {
          setSelectedWarehouse((prev) => (items.some((w) => String(w.id) === prev) ? prev : String(items[0].id)));
        }
      })
      .catch(() => {});
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // GET /forecast/compare?product_id=&warehouse_id= — each model type's
  // most recent *completed* run for this pair, omitting any model type
  // never trained for it. Plain array (not paginated).
  const fetchCompare = useCallback(async () => {
    if (!selectedProduct || !selectedWarehouse) return;
    setCompareLoading(true);
    try {
      const runs = await forecastApi.compareForecastRuns({
        productId: parseInt(selectedProduct, 10),
        warehouseId: parseInt(selectedWarehouse, 10),
      });
      setCompareRuns(Array.isArray(runs) ? runs : []);
    } catch (e) {
      setCompareRuns([]);
    } finally {
      setCompareLoading(false);
    }
  }, [selectedProduct, selectedWarehouse]);

  useEffect(() => {
    fetchCompare();
  }, [fetchCompare]);

  const handleTrainModel = async () => {
    setIsTraining(true);
    setForecastStatus('Training model in background…');
    try {
      const res = await forecastApi.createForecast({
        productId: parseInt(selectedProduct, 10),
        warehouseId: parseInt(selectedWarehouse, 10),
        modelType,
        forecastHorizon: parseInt(horizonDays, 10),
      });
      setForecastStatus(`Run #${res.id} scheduled — training happens in the background`);
      // Training runs as a background task on the server; there's no push
      // notification when it finishes, so best-effort re-poll the compare
      // endpoint a few seconds later. The manual refresh button covers the
      // rest.
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(fetchCompare, 4000);
    } catch (e) {
      setForecastStatus(e.response?.data?.detail || 'Failed to schedule the forecast run.');
    } finally {
      setIsTraining(false);
    }
  };

  // Union every forecast_date across every compared run — different runs
  // can cover different calendar ranges (trained at different times), so a
  // model with no prediction for a given date just leaves a gap rather
  // than plotting a fabricated 0.
  const chartData = useMemo(() => {
    const dateSet = new Set();
    compareRuns.forEach((run) => (run.predictions || []).forEach((p) => dateSet.add(p.forecast_date)));
    const dates = Array.from(dateSet).sort();
    return dates.map((date) => {
      const row = { date };
      compareRuns.forEach((run) => {
        const match = (run.predictions || []).find((p) => p.forecast_date === date);
        row[run.model_type] = match ? match.predicted_sales : null;
      });
      return row;
    });
  }, [compareRuns]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-status-info" />
            <span>Demand Forecasting & Model Sandbox</span>
          </h2>
          <p className="text-xs text-content-muted">Train a model per product/warehouse pair and compare trained model types</p>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="p-5 rounded-2xl glass-card border border-hairline space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-content-muted font-medium mb-1 block">Product / SKU</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-2 rounded-lg glass-input text-content focus:outline-none focus:border-hairline-strong"
            >
              {products.length > 0 ? (
                products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (SKU-{p.sku_code || p.id})</option>
                ))
              ) : (
                <option value="1">Loading products…</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-content-muted font-medium mb-1 block">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full p-2 rounded-lg glass-input text-content focus:outline-none focus:border-hairline-strong"
            >
              {warehouses.length > 0 ? (
                warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code || w.id})</option>
                ))
              ) : (
                <option value="1">Loading warehouses…</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-content-muted font-medium mb-1 block">Algorithm</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full p-2 rounded-lg glass-input text-content focus:outline-none focus:border-hairline-strong"
            >
              <option value="random_forest">Random Forest</option>
              <option value="exponential_smoothing">Exponential Smoothing (ETS)</option>
              <option value="moving_average">Moving Average (Baseline)</option>
            </select>
          </div>

          <div>
            <label className="text-content-muted font-medium mb-1 block">Forecast Horizon: {horizonDays} Days</label>
            <input
              type="range"
              min={7}
              max={90}
              value={horizonDays}
              onChange={(e) => setHorizonDays(e.target.value)}
              className="w-full accent-zinc-300 mt-2.5"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-hairline">
          <span className="text-xs text-content-muted">
            {forecastStatus && <span className="text-content-secondary">● {forecastStatus}</span>}
          </span>

          <button
            onClick={handleTrainModel}
            disabled={isTraining}
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold flex items-center gap-2 transition-colors duration-150 active:scale-95 disabled:opacity-50"
          >
            {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Train Model</span>
          </button>
        </div>
      </div>

      {/* Multi-Model Comparison Chart — real GET /forecast/compare data */}
      <div className="p-5 rounded-2xl glass-card border border-hairline space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            Trained Model Comparison
          </span>
          <button
            onClick={() => {
              fetchCompare();
            }}
            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface/70 transition-colors duration-150"
            title="Refresh comparison"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${compareLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid {...chartGridProps(chart)} />
                <XAxis dataKey="date" {...chartAxisProps(chart)} />
                <YAxis {...chartAxisProps(chart)} />
                <Tooltip {...chartTooltipProps(chart)} />
                <Legend
                  formatter={(value) => MODEL_LABELS[value] || value}
                  wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                />
                {compareRuns.map((run) => (
                  <Line
                    key={run.model_type}
                    type="monotone"
                    dataKey={run.model_type}
                    stroke={MODEL_COLORS[run.model_type] || chart.series[0]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-content-muted text-center px-6">
              {compareLoading
                ? 'Loading trained runs…'
                : 'No completed forecast runs yet for this product/warehouse pair — train one above.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
