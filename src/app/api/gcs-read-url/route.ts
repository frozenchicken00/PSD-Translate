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
    const { fileName } = await req.json();
    
    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    
    // Verify the file exists
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    
    if (!exists) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }
    
    // Generate a signed URL for reading the file
    const [readUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
      version: "v4",
    });
    
    return NextResponse.json({
      success: true,
      readUrl,
      fileName
    });
  } catch (error) {
    console.error("Error generating read URL:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
} 