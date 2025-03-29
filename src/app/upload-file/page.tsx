"use client";
import { useState, useCallback } from "react";

export const runtime = "nodejs";

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("EN"); // Default to English
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const languages = [
    { code: "AR", name: "Arabic" },
    { code: "BG", name: "Bulgarian" },
    { code: "CS", name: "Czech" },
    { code: "DA", name: "Danish" },
    { code: "DE", name: "German" },
    { code: "EL", name: "Greek" },
    { code: "EN", name: "English" },
    { code: "ES", name: "Spanish" },
    { code: "ET", name: "Estonian" },
    { code: "FI", name: "Finnish" },
    { code: "FR", name: "French" },
    { code: "HU", name: "Hungarian" },
    { code: "ID", name: "Indonesian" },
    { code: "IT", name: "Italian" },
    { code: "JA", name: "Japanese" },
    { code: "KO", name: "Korean" },
    { code: "LT", name: "Lithuanian" },
    { code: "LV", name: "Latvian" },
    { code: "NB", name: "Norwegian Bokmål" },
    { code: "NL", name: "Dutch" },
    { code: "PL", name: "Polish" },
    { code: "PT", name: "Portuguese" },
    { code: "RO", name: "Romanian" },
    { code: "RU", name: "Russian" },
    { code: "SK", name: "Slovak" },
    { code: "SL", name: "Slovenian" },
    { code: "SV", name: "Swedish" },
    { code: "TR", name: "Turkish" },
    { code: "UK", name: "Ukrainian" },
    { code: "ZH", name: "Chinese" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadProgress(0);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLang(e.target.value);
  };

  // Function to upload file directly to GCS using signed URL
  const uploadFileToGcs = async (file: File, signedUrl: string): Promise<boolean> => {
    try {
      setCurrentStep("Uploading file to cloud storage...");
      
      // Create a ReadableStream from the file
      const stream = file.stream();
      const reader = stream.getReader();
      
      let uploaded = 0;
      const fileSize = file.size;
      
      // Manual progress tracking for fetch
      const updateProgress = (chunk: Uint8Array) => {
        uploaded += chunk.length;
        const percentComplete = Math.round((uploaded / fileSize) * 100);
        setUploadProgress(percentComplete);
      };
      
      // Use a simpler fetch-based approach instead of XMLHttpRequest
      const response = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-goog-acl': 'public-read'
        },
        body: file, // Send the file directly
        // credentials: 'omit' // Don't send credentials
      });
      
      // Simulate progress since fetch doesn't have progress events
      const simulateProgress = async () => {
        let currentProgress = 0;
        const increment = 5;
        const delay = 500;
        
        while (currentProgress < 100) {
          await new Promise(resolve => setTimeout(resolve, delay));
          currentProgress = Math.min(95, currentProgress + increment);
          setUploadProgress(currentProgress);
        }
      };
      
      // Start progress simulation
      simulateProgress();
      
      if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
      }
      
      // Complete the progress
      setUploadProgress(100);
      console.log('Upload completed successfully');
      
      return true;
    } catch (error) {
      console.error("Error uploading to GCS:", error);
      // For debugging purposes, check if errors are related to CORS
      if (error instanceof Error && error.message.includes('NetworkError')) {
        console.error('This appears to be a CORS-related issue');
      }
      throw error;
    }
  };

  // Try another upload approach if the above doesn't work
  const fallbackUpload = async (file: File, signedUrl: string, fileName: string): Promise<boolean> => {
    try {
      setCurrentStep("Trying fallback upload method...");
      
      // Upload the file through your own server as a fallback
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      
      const response = await fetch('/api/proxy-upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Fallback upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Error with fallback upload:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    setLoading(true);
    setCurrentStep("Preparing upload...");
    setDownloadUrl(null);
    
    try {
      // Configure CORS first (only needed once per deployment or if CORS settings change)
      try {
        await fetch("/api/configure-cors", { method: "GET" });
      } catch (corsError) {
        console.warn("Could not configure CORS, might already be set:", corsError);
      }
      
      // Step 1: Get a signed URL for uploading
      const signedUrlResponse = await fetch("/api/gcs-signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream"
        }),
      });
      
      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }
      
      const { signedUrl, fileName } = await signedUrlResponse.json();
      
      // Step 2: Upload file directly to GCS
      let uploadSuccessful = false;
      
      try {
        // Try direct upload first
        uploadSuccessful = await uploadFileToGcs(file, signedUrl);
      } catch (error) {
        console.error("Direct upload failed, trying fallback:", error);
        setCurrentStep("Direct upload failed, trying alternative method...");
        
        try {
          // Try fallback upload if direct upload fails
          uploadSuccessful = await fallbackUpload(file, signedUrl, fileName);
        } catch (fallbackError) {
          console.error("Fallback upload also failed:", fallbackError);
          throw new Error("All upload methods failed. Please try again later.");
        }
      }
      
      if (!uploadSuccessful) {
        throw new Error("File upload failed");
      }
      
      setCurrentStep("Processing and translating file...");
      
      // Get a read URL for the uploaded file
      const getReadUrlResponse = await fetch("/api/gcs-read-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });
      
      if (!getReadUrlResponse.ok) {
        throw new Error("Failed to get read URL for uploaded file");
      }
      
      const { readUrl } = await getReadUrlResponse.json();
      
      // Step 3: Trigger processing of the uploaded file
      const processResponse = await fetch("/api/process-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          targetLang,
          fileUrl: readUrl
        }),
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Translation process failed");
      }
      
      const data = await processResponse.json();
      setDownloadUrl(data.downloadUrl);
      setCurrentStep("Translation complete!");
      setLoading(false);
      
    } catch (error) {
      console.error(error);
      alert("Translation failed: " + (error instanceof Error ? error.message : "Unknown error"));
      setCurrentStep("Error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4 transform -rotate-1">
          Translate Your Webtoon
        </h1>
        <div className="speech-bubble max-w-2xl mx-auto">
          <p>
            Upload your PSD file, choose the target language, and we&apos;ll
            translate the text while preserving the artwork!
          </p>
        </div>
      </div>

      <div className="comic-panel bg-panel">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-foreground/30 rounded-lg p-8 text-center">
            {file ? (
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-lg font-bold mb-1">{file.name}</p>
                <p className="text-sm text-foreground/70 mb-4">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  className="text-primary hover:text-secondary underline"
                  onClick={() => setFile(null)}
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-foreground/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-lg mb-2">Drag and drop your PSD file here</p>
                <p className="text-sm text-foreground/70 mb-4">
                  Or click to browse files
                </p>
                <label className="btn cursor-pointer">
                  <span>Select File</span>
                  <input
                    type="file"
                    accept=".psd"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Language Selection */}
          <div className="flex flex-col items-center">
            <label htmlFor="language" className="text-lg mb-2">
              Select Target Language:
            </label>
            <select
              id="language"
              value={targetLang}
              onChange={handleLanguageChange}
              className="border rounded px-2 py-1"
              style={{ color: 'black' }}
            >
              {languages.map((lang) => (
              <option key={lang.code} value={lang.code} style={{ color: 'black' }}>
                {lang.name}
              </option>
              ))}
            </select>
          </div>

          {/* Add upload progress indicator */}
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <p className="text-center mb-2">{currentStep}</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{width: `${uploadProgress}%`}}
                ></div>
              </div>
              <p className="text-center mt-2">{uploadProgress}% uploaded</p>
            </div>
          )}
          
          {loading && uploadProgress === 100 && (
            <div className="mt-4 text-center">
              <p>{currentStep}</p>
              <div className="mt-4 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!file || loading}
              className={`btn px-8 py-3 text-lg flex items-center gap-2 ${
                (!file || loading) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                  <span>Translate Now</span>
                </>
              )}
            </button>
          </div>
        </form>

        {downloadUrl && (
          <div className="mt-8 text-center">
            <div className="comic-panel bg-accent/20 inline-block">
              <h3 className="text-xl mb-2">Translation Complete!</h3>
              <p className="mb-4">
                Your translated file is ready for download.
              </p>
              <a
                href={downloadUrl}
                download="translated-webtoon.psd"
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-secondary inline-flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Translated PSD
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="comic-panel bg-panel zoom-effect">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-primary mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h3 className="text-xl font-bold mb-2">Secure Files</h3>
            <p>
              Your original artwork and PSD files are handled securely and never
              shared.
            </p>
          </div>
        </div>

        <div className="comic-panel bg-panel zoom-effect">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-secondary mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-xl font-bold mb-2">Fast Processing</h3>
            <p>
              Our advanced AI completes most translations in just a few minutes.
            </p>
          </div>
        </div>

        <div className="comic-panel bg-panel zoom-effect">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-accent mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <h3 className="text-xl font-bold mb-2">Multiple Languages</h3>
            <p>
              Translate your webtoons to reach global audiences in over 20
              languages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}