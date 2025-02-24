"use client";
import { useState } from "react";

export const runtime = "nodejs";

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("psd", file);

    const res = await fetch("/api/translate", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      alert("Translate failed!");
      setLoading(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Translate PSD</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".psd" onChange={handleFileChange} />
        <button type="submit" disabled={loading} className="ml-4 btn">
          {loading ? "Translating..." : "Translate"}
        </button>
      </form>
      {downloadUrl && (
        <div className="mt-4">
          <a href={downloadUrl} download="output.psd" className="text-blue-600">
            Download Translated PSD
          </a>
        </div>
      )}
    </div>
  );
}