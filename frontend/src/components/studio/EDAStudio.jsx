import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, UploadCloud, RefreshCw } from 'lucide-react';
import * as uploadApi from '../../api/upload';
import * as edaApi from '../../api/eda';
const EDA_POLL_ATTEMPTS = 5;
const EDA_POLL_DELAY_MS = 2500;

export const EDAStudio = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [eda, setEda] = useState(null);
  const [edaLoading, setEdaLoading] = useState(true);
  const [edaError, setEdaError] = useState(null);
  const pollTimerRef = useRef(null);

  const fetchEda = useCallback(async (uploadId) => {
    setEdaLoading(true);
    try {
      const data = await edaApi.getEda(uploadId);
      if (data && data.status === 'processing') {
        return 'processing';
      }
      setEda(data);
      setEdaError(null);
      return 'done';
    } catch (err) {
      // 404 just means nothing has been uploaded yet — an expected, quiet
      // empty state, not an error banner.
      if (err.response?.status !== 404) {
        setEdaError(err.response?.data?.detail || 'Failed to load EDA results.');
      }
      setEda(null);
      return 'error';
    } finally {
      setEdaLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show whatever dataset was most recently uploaded, if any, on mount.
    fetchEda(undefined);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [fetchEda]);

  const pollEdaUntilReady = useCallback(
    (uploadId, attemptsLeft) => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(async () => {
        const result = await fetchEda(uploadId);
        if (result === 'processing' && attemptsLeft > 0) {
          setUploadStatus('Still processing — charts will appear once ready…');
          pollEdaUntilReady(uploadId, attemptsLeft - 1);
        } else if (result === 'done') {
          setUploadStatus('Processing complete — EDA updated.');
        } else if (result === 'processing') {
          setUploadStatus('Still processing — click refresh to check again.');
        }
      }, EDA_POLL_DELAY_MS);
    },
    [fetchEda]
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Uploading and validating CSV schema…');

    try {
      // uploadCsv(file) already builds the multipart form body itself —
      // pass the raw File, not a pre-built FormData (double-wrapping it
      // sent the backend a form field containing a FormData object
      // instead of the file).
      const res = await uploadApi.uploadCsv(file);
      setUploadStatus(`Upload #${res.id} accepted — processing in the background…`);
      pollEdaUntilReady(res.id, EDA_POLL_ATTEMPTS);
    } catch (err) {
      setUploadStatus(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const columns = eda ? Object.keys(eda.summary_statistics || {}) : [];
  const statRows = columns.length ? Object.keys(eda.summary_statistics[columns[0]]) : [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-content flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-content-secondary" />
            <span>Sales EDA & Data Ingestion</span>
          </h2>
          <p className="text-xs text-content-muted">Upload sales history and explore the resulting distribution statistics</p>
        </div>
        <button
          onClick={() => {
            fetchEda(undefined);
          }}
          className="p-1.5 rounded-lg bg-canvas/60 border border-hairline text-content-muted hover:text-content transition-colors duration-150 self-start sm:self-auto"
          title="Refresh EDA for the latest upload"
        >
          <RefreshCw className={`w-4 h-4 ${edaLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CSV Upload Card */}
      <div className="p-6 rounded-2xl glass-card border border-dashed border-hairline-strong text-center space-y-3 relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="w-12 h-12 rounded-2xl bg-surface text-content-secondary flex items-center justify-center mx-auto ring-1 ring-hairline">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm font-medium text-content">
            {uploading ? 'Uploading…' : 'Drop Sales CSV or Click to Browse'}
          </div>
          <div className="text-xs text-content-muted mt-1">
            Required columns: date, store, item, sales
          </div>
        </div>
        {uploadStatus && (
          <div className="text-xs text-content-secondary font-medium">
            ● {uploadStatus}
          </div>
        )}
      </div>

      {edaError && (
        <div className="px-3 py-2 rounded-lg border border-status-bad/30 bg-status-bad/10 text-status-bad text-xs">
          {edaError}
        </div>
      )}

      {/* Real EDA output from GET /eda — summary stats + server-rendered charts */}
      {eda ? (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-hairline space-y-3">
            <div className="flex items-center gap-4 text-xs text-content-secondary">
              <span className="font-semibold uppercase tracking-wider text-content-muted">Dataset Summary</span>
              <span>Unique stores: <span className="text-content font-mono">{eda.unique_stores}</span></span>
              <span>Unique items: <span className="text-content font-mono">{eda.unique_items}</span></span>
            </div>

            {columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-content-muted border-b border-hairline uppercase tracking-wider text-[10px]">
                      <th className="py-2 pr-4 font-medium"> </th>
                      {columns.map((col) => (
                        <th key={col} className="py-2 pr-4 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {statRows.map((stat) => (
                      <tr key={stat}>
                        <td className="py-2 pr-4 text-content-muted">{stat}</td>
                        {columns.map((col) => (
                          <td key={col} className="py-2 pr-4 text-content font-mono">
                            {Number(eda.summary_statistics[col][stat]).toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Sales trend', eda.sales_trend_image],
              ['Correlation heatmap', eda.correlation_heatmap_image],
              ['Sales distribution', eda.sales_distribution_image],
              ['Sales boxplot', eda.sales_boxplot_image],
            ].map(([label, img]) =>
              img ? (
                <div key={label} className="p-3 rounded-2xl glass-card border border-hairline space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-content-muted">{label}</span>
                  <img src={`data:image/png;base64,${img}`} alt={label} className="w-full rounded-lg" />
                </div>
              ) : null
            )}
          </div>
        </div>
      ) : (
        !edaError && (
          <div className="p-12 rounded-2xl glass-card border border-hairline text-center text-content-muted text-xs">
            {edaLoading ? 'Loading…' : 'No dataset uploaded yet — drop a CSV above to see distribution statistics and charts.'}
          </div>
        )
      )}
    </div>
  );
};
