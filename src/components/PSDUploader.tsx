import React, { useState } from 'react';

interface UploadStatus {
  status: 'idle' | 'getting-upload-url' | 'uploading' | 'starting-translation' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  jobId?: string;
  downloadUrl?: string;
}

export default function PSDUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState<string>('EN');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.name.toLowerCase().endsWith('.psd')) {
        alert('Please select a PSD file');
        return;
      }
      
      setFile(selectedFile);
      setUploadStatus({ status: 'idle', progress: 0 });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    try {
      // Step 1: Get a signed URL for direct upload
      setUploadStatus({ status: 'getting-upload-url', progress: 0 });
      
      const urlResponse = await fetch('/api/gcs-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name,
          fileType: 'image/vnd.adobe.photoshop' 
        }),
      });
      
      if (!urlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${await urlResponse.text()}`);
      }
      
      const { uploadUrl, fileKey } = await urlResponse.json();
      
      // Step 2: Upload file directly to GCS using the signed URL
      setUploadStatus({ status: 'uploading', progress: 10 });
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'image/vnd.adobe.photoshop',
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }
      
      setUploadStatus({ status: 'starting-translation', progress: 50 });
      
      // Step 3: Start the translation process
      const translateResponse = await fetch('/api/translate-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileKey,
          targetLang 
        }),
      });
      
      if (!translateResponse.ok) {
        throw new Error(`Failed to start translation: ${await translateResponse.text()}`);
      }
      
      const { jobId } = await translateResponse.json();
      setUploadStatus({ 
        status: 'processing', 
        progress: 60,
        jobId
      });
      
      // Step 4: Start polling for job status
      pollJobStatus(jobId);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus({ 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };
  
  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/translation-status?jobId=${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get job status: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        setUploadStatus({
          status: 'completed',
          progress: 100,
          jobId,
          downloadUrl: data.downloadUrl
        });
        return;
      } else if (data.status === 'failed') {
        setUploadStatus({
          status: 'error',
          progress: 0,
          error: data.error || 'Translation failed',
          jobId
        });
        return;
      }
      
      // Still processing - update progress and poll again
      setUploadStatus({
        status: 'processing',
        progress: Math.min(90, uploadStatus.progress + 5), // Increment progress
        jobId
      });
      
      // Poll again after delay
      setTimeout(() => pollJobStatus(jobId), 5000);
    } catch (error) {
      console.error('Polling failed:', error);
      setUploadStatus({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to check translation status',
        jobId
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">PSD Translator</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select PSD File
        </label>
        <input
          type="file"
          accept=".psd"
          onChange={handleFileChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={uploadStatus.status !== 'idle' && uploadStatus.status !== 'error'}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Language
        </label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          disabled={uploadStatus.status !== 'idle' && uploadStatus.status !== 'error'}
        >
          <option value="EN">English</option>
          <option value="DE">German</option>
          <option value="FR">French</option>
          <option value="ES">Spanish</option>
          <option value="IT">Italian</option>
          <option value="JA">Japanese</option>
          <option value="KO">Korean</option>
          <option value="ZH">Chinese</option>
        </select>
      </div>
      
      {file && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      )}
      
      {uploadStatus.status !== 'idle' && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                uploadStatus.status === 'error' ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ width: `${uploadStatus.progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-center">
            {uploadStatus.status === 'getting-upload-url' && 'Preparing upload...'}
            {uploadStatus.status === 'uploading' && 'Uploading file...'}
            {uploadStatus.status === 'starting-translation' && 'Starting translation process...'}
            {uploadStatus.status === 'processing' && 'Translating PSD file...'}
            {uploadStatus.status === 'completed' && 'Translation completed!'}
            {uploadStatus.status === 'error' && `Error: ${uploadStatus.error}`}
          </p>
        </div>
      )}
      
      {uploadStatus.status === 'completed' && uploadStatus.downloadUrl && (
        <div className="mb-4 p-4 bg-green-50 rounded-md text-center">
          <p className="text-green-800 mb-2">Translation complete!</p>
          <a
            href={uploadStatus.downloadUrl}
            download
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Download Translated PSD
          </a>
        </div>
      )}
      
      <button
        onClick={handleUpload}
        disabled={!file || (uploadStatus.status !== 'idle' && uploadStatus.status !== 'error')}
        className={`w-full py-2 px-4 rounded-md font-medium text-white 
          ${!file || (uploadStatus.status !== 'idle' && uploadStatus.status !== 'error')
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'} 
          transition-colors`}
      >
        {uploadStatus.status === 'idle' || uploadStatus.status === 'error' ? 'Upload & Translate' : 'Processing...'}
      </button>
    </div>
  );
} 