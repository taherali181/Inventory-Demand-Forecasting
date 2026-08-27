import React, { useState } from 'react';
import EdaCharts from '../components/EdaCharts';
import FileUploadForm from '../components/FileUploadForm';

function UploadPage() {
  const [result, setResult] = useState(null);

  return (
    <div className="page">
      <h1>Upload sales data</h1>
      <p>
        CSV must have <code>date, store, item, sales</code> columns. Rows are upserted into the
        database (auto-creating warehouses/products from <code>store</code>/<code>item</code>) —
        re-uploading the same file is safe and won&apos;t create duplicates.
      </p>
      <FileUploadForm onUploadSuccess={setResult} />

      {result && (
        <div className="upload-result">
          <p className="form-success">
            {result.message} ({result.rows_persisted} new row(s) persisted to the database.)
          </p>
          <EdaCharts eda={result.eda} />
        </div>
      )}
    </div>
  );
}

export default UploadPage;
