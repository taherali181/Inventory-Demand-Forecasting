import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = () => {
        const formData = new FormData();
        formData.append('file', file);

        axios.post('http://127.0.0.1:8000/perform_eda/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(response => {
            onUploadSuccess(response.data);
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
        </div>
    );
};

export default FileUpload;