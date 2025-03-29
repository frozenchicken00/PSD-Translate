/**
 * DirectUpload component that uploads files directly to GCS
 * and then passes the GCS URL to the translation API
 */
"use client";

import { useState, useRef } from "react";
import { ClipLoader } from "react-spinners";

// Define the component props
interface DirectUploadProps {
  onUploadComplete?: (downloadUrl: string) => void;
}

const DirectUpload: React.FC<DirectUploadProps> = ({ onUploadComplete }) => {
  // Setup state
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState<string>("EN");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    // Clear previous errors and results
    setError(null);
    setDownloadUrl(null);
    
    // Validate file type
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.psd')) {
      setError("Only PSD files are supported");
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
  };
  
  // Handle language selection
  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLang(e.target.value);
  };
  
  // Reset the form
  const resetForm = () => {
    setFile(null);
    setUploadProgress(0);
    setError(null);
    setDownloadUrl(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Upload a file directly to GCS then pass the URL to the translation API
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Step 1: Get a signed URL for direct upload
      const getUrlResponse = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: "image/vnd.adobe.photoshop",
        }),
      });
      
      if (!getUrlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${getUrlResponse.statusText}`);
      }
      
      const { uploadUrl, fileName } = await getUrlResponse.json();
      
      // Step 2: Upload the file directly to GCS using the signed URL
      setUploadProgress(20);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "image/vnd.adobe.photoshop",
        },
        body: file,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }
      
      setUploadProgress(50);
      
      // Step 3: Call the translation API with the GCS file path
      const translateResponse = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcsFilePath: fileName,
          targetLang,
        }),
      });
      
      if (!translateResponse.ok) {
        // Check for 413 error specifically
        if (translateResponse.status === 413) {
          throw new Error("File is too large. The maximum size allowed is 4.5MB.");
        }
        throw new Error(`Translation failed: ${translateResponse.statusText}`);
      }
      
      const result = await translateResponse.json();
      setUploadProgress(100);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Set the download URL
      setDownloadUrl(result.downloadUrl);
      
      // Call the callback if provided
      if (onUploadComplete && result.downloadUrl) {
        onUploadComplete(result.downloadUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload and Translate PSD</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {downloadUrl ? (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          <p className="font-semibold">Translation complete!</p>
          <a 
            href={downloadUrl}
            download
            className="mt-2 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download Translated PSD
          </a>
          <button 
            onClick={resetForm}
            className="mt-2 ml-2 inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Translate Another File
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select PSD File
            </label>
            <input
              type="file"
              accept=".psd"
              onChange={handleFileChange}
              disabled={isUploading}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0 file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-1 text-sm text-gray-500">
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Language
            </label>
            <select
              value={targetLang}
              onChange={handleLangChange}
              disabled={isUploading}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300
                       focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
          
          {isUploading ? (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <ClipLoader size={16} color="#3B82F6" className="mr-2" />
                {uploadProgress < 50 ? "Uploading file..." : "Translating content..."}
              </p>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full py-2 px-4 rounded-md text-white ${
                !file
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Upload & Translate
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default DirectUpload; 