import DirectUpload from '../components/DirectUpload';

export default function UploadPSDPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">PSD Translation Service</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Upload your PSD file using the form below</li>
          <li>Select the target language for translation</li>
          <li>Click "Upload & Translate" to start the process</li>
          <li>Wait for the translation to complete</li>
          <li>Download the translated PSD file</li>
        </ol>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Features</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Direct upload to Google Cloud Storage (bypasses server limits)</li>
          <li>Support for large PSD files (no 4.5MB limit)</li>
          <li>Fast and efficient translation process</li>
          <li>Preserves all layers, styles, and formatting</li>
        </ul>
      </div>
      
      <div>
        <DirectUpload />
      </div>
    </div>
  );
} 