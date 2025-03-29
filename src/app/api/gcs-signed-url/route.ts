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
    const { fileName, fileType } = await req.json();
    
    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/\s+/g, '-').toLowerCase();
    
    // Generate a signed URL for direct upload
    const file = bucket.file(sanitizedFileName);
    
    // Delete the file if it already exists to avoid conflicts
    try {
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`Deleted existing file ${sanitizedFileName}`);
      }
    } catch (err) {
      console.warn(`Error checking/deleting existing file: ${err}`);
    }
    
    // Create signed URL with proper options for CORS
    const [signedUrl] = await file.getSignedUrl({
      action: "write",
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
      contentType: fileType || "image/vnd.adobe.photoshop",
      version: "v4",
      extensionHeaders: {
        "x-goog-acl": "public-read" // Make uploaded file public
      }
    });
    
    // Log the URL (but not the query parameters)
    const baseUrl = signedUrl.split('?')[0];
    console.log(`Generated signed URL (base): ${baseUrl}`);
    
    return NextResponse.json({
      success: true,
      signedUrl,
      fileName: sanitizedFileName,
      bucketName: process.env.GCS_BUCKET_NAME
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
} 