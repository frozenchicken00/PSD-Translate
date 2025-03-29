import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

// GCS Configuration
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_KEYFILE,
  projectId: process.env.GCS_PROJECT_ID,
});

if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('GCS_BUCKET_NAME environment variable is not defined');
}
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const fileName = formData.get("fileName") as string;
    
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    
    if (!fileName) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/\s+/g, '-').toLowerCase();
    
    // Convert file to buffer
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    
    // Upload to GCS
    const gcFile = bucket.file(sanitizedFileName);
    
    await gcFile.save(fileBuffer, {
      contentType: file.type || "application/octet-stream",
      public: true, // Make file publicly accessible
      metadata: {
        contentType: file.type || "application/octet-stream"
      }
    });
    
    // Verify the file was uploaded
    const [exists] = await gcFile.exists();
    if (!exists) {
      throw new Error(`File upload verification failed for ${sanitizedFileName}`);
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      fileName: sanitizedFileName
    });
  } catch (error) {
    console.error("Proxy upload error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error",
      success: false
    }, { status: 500 });
  }
} 