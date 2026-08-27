import React, { useState } from 'react';
import { uploadCsv } from '../api/upload';

function FileUploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadCsv(file);
      onUploadSuccess(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploading…' : 'Upload'}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export default FileUploadForm;
