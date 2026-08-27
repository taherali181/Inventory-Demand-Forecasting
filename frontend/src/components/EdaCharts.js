import React from 'react';

function EdaCharts({ eda }) {
  if (!eda) return null;

  const columns = Object.keys(eda.summary_statistics || {});
  const statRows = columns.length ? Object.keys(eda.summary_statistics[columns[0]]) : [];

  return (
    <div className="eda-results">
      <div className="eda-meta">
        <span>Unique stores: {eda.unique_stores}</span>
        <span>Unique items: {eda.unique_items}</span>
      </div>

      {columns.length > 0 && (
        <div className="table-scroll">
          <table className="stats-table">
            <thead>
              <tr>
                <th />
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statRows.map((stat) => (
                <tr key={stat}>
                  <td>{stat}</td>
                  {columns.map((col) => (
                    <td key={col}>{Number(eda.summary_statistics[col][stat]).toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="chart-grid">
        <img src={`data:image/png;base64,${eda.sales_trend_image}`} alt="Sales trend over time" />
        <img src={`data:image/png;base64,${eda.correlation_heatmap_image}`} alt="Correlation heatmap" />
        <img src={`data:image/png;base64,${eda.sales_distribution_image}`} alt="Sales distribution" />
        <img src={`data:image/png;base64,${eda.sales_boxplot_image}`} alt="Sales boxplot" />
      </div>
    </div>
  );
}

export default EdaCharts;
