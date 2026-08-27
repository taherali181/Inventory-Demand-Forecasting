import React, { useEffect, useRef, useState } from 'react';
import EdaCharts from '../components/EdaCharts';
import FileUploadForm from '../components/FileUploadForm';
import { getEda } from '../api/eda';

// Persistence + EDA now run as a backend background task (POST /upload
// returns immediately with status "processing"), so this page polls
// GET /eda?upload_id=<id> until it's no longer processing.
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

function UploadPage() {
  const [eda, setEda] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  const pollUntilDone = async (uploadId) => {
    const startedAt = Date.now();
    setStatusMessage('Persisting data and generating charts…');
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      // eslint-disable-next-line no-await-in-loop
      const data = await getEda(uploadId);
      if (cancelledRef.current) return;
      if (data.status !== 'processing') {
        setEda(data);
        setStatusMessage(null);
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
    if (!cancelledRef.current) {
      setError('Processing is taking longer than expected — check back on this page shortly.');
      setStatusMessage(null);
    }
  };

  const handleUploadSuccess = async (uploadResult) => {
    setError(null);
    setEda(null);
    try {
      await pollUntilDone(uploadResult.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Processing failed.');
      setStatusMessage(null);
    }
  };

  return (
    <div className="page">
      <h1>Upload sales data</h1>
      <p>
        CSV must have <code>date, store, item, sales</code> columns. Rows are upserted into the
        database (auto-creating warehouses/products from <code>store</code>/<code>item</code>) —
        re-uploading the same file is safe and won&apos;t create duplicates.
      </p>
      <FileUploadForm onUploadSuccess={handleUploadSuccess} />

      {statusMessage && <p className="hint">{statusMessage}</p>}
      {error && <p className="form-error">{error}</p>}

      {eda && (
        <div className="upload-result">
          <p className="form-success">Upload processed successfully.</p>
          <EdaCharts eda={eda} />
        </div>
      )}
    </div>
  );
}

export default UploadPage;
