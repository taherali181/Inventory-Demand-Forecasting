import React, { useState } from 'react';
import { getEda } from '../api/eda';
import EdaCharts from '../components/EdaCharts';

function EdaPage() {
  const [eda, setEda] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetch = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await getEda();
      if (data.status === 'processing') {
        setError('The most recent upload is still processing — try again in a moment.');
        setEda(null);
      } else {
        setEda(data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'EDA failed.');
      setEda(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Exploratory data analysis</h1>
      <p>Re-runs EDA over whichever dataset was most recently uploaded.</p>
      <button type="button" onClick={handleFetch} disabled={isLoading}>
        {isLoading ? 'Loading…' : 'Run EDA on current dataset'}
      </button>
      {error && <p className="form-error">{error}</p>}
      <EdaCharts eda={eda} />
    </div>
  );
}

export default EdaPage;
