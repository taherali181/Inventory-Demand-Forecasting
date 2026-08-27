import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardKpis } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';

function formatRatio(value, digits = 2) {
  return value == null ? '—' : value.toFixed(digits);
}

function formatPercent(value) {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [kpisError, setKpisError] = useState(null);

  useEffect(() => {
    getDashboardKpis(30)
      .then(setKpis)
      .catch((err) => setKpisError(err.response?.data?.detail || 'Could not load dashboard metrics.'));
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>
        {user
          ? `Signed in as ${user.email}.`
          : 'Browsing as a guest — log in to attribute uploads to your account.'}
      </p>

      {kpisError && <p className="form-error">{kpisError}</p>}
      {kpis && (
        <div className="kpi-tiles">
          <div className="kpi-tile">
            <span className="kpi-value">{formatRatio(kpis.inventory_turnover)}</span>
            <span className="kpi-label">Inventory turnover (last {kpis.period_days}d)</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-value">{formatPercent(kpis.stockout_rate)}</span>
            <span className="kpi-label">
              Stockout rate ({kpis.stockout_count}/{kpis.stock_level_count})
            </span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-value">{kpis.forecast_mape != null ? `${kpis.forecast_mape.toFixed(1)}%` : '—'}</span>
            <span className="kpi-label">
              Forecast MAPE
              {kpis.forecast_sample_size > 0 ? ` (n=${kpis.forecast_sample_size})` : ' (no data yet)'}
            </span>
          </div>
        </div>
      )}

      <div className="dashboard-links">
        <Link to="/upload" className="card-link">
          <h2>Upload sales data</h2>
          <p>Upload a CSV to run EDA and persist it into the inventory database.</p>
        </Link>
        <Link to="/forecast" className="card-link">
          <h2>Forecast</h2>
          <p>Generate sales predictions from the most recently uploaded dataset.</p>
        </Link>
        <Link to="/eda" className="card-link">
          <h2>Exploratory analysis</h2>
          <p>Re-run charts and summary stats on the current dataset.</p>
        </Link>
      </div>
    </div>
  );
}

export default DashboardPage;
