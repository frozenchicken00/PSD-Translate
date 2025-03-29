import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

// GCS Configuration
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_KEYFILE,
  projectId: process.env.GCS_PROJECT_ID,
});

if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('GCS_BUCKET_NAME environment variable is not defined');
}
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * Generate a signed URL for direct upload to GCS
 */
export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();
    
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 });
    }
    
    // Generate a unique file name to prevent collisions
    const sanitizedFileName = fileName.replace(/\s+/g, '-').toLowerCase();
    const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
    
    // Create a signed URL that allows direct upload to GCS
    const [signedUrl] = await bucket.file(uniqueFileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    });
    
    return NextResponse.json({
      fileName: uniqueFileName,
      uploadUrl: signedUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate upload URL" 
    }, { status: 500 });
  }
} 