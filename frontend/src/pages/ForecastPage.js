import React, { useState } from 'react';
import { getForecast } from '../api/forecast';
import ForecastChart from '../components/ForecastChart';

function ForecastPage() {
  const [horizon, setHorizon] = useState(7);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await getForecast(horizon);
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
      <form className="forecast-form" onSubmit={handleSubmit}>
        <label htmlFor="horizon">Forecast horizon (days)</label>
        <input
          id="horizon"
          type="number"
          min="1"
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Forecasting…' : 'Get forecast'}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {result && (
        <div className="forecast-result">
          <ForecastChart predictions={result.predictions} />
          <p className="forecast-note">
            Note: this currently backtests against historical data rather than predicting the
            next {result.forecast_horizon} days into the future — a known gap tracked for a later
            phase.
          </p>
        </div>
      )}
    </div>
  );
}

export default ForecastPage;
