import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>
        {user
          ? `Signed in as ${user.email}.`
          : 'Browsing as a guest — log in to attribute uploads to your account.'}
      </p>
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
