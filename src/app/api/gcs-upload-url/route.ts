import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth";

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
    // Optional: Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileType } = await req.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" }, 
        { status: 400 }
      );
    }

    // Generate a unique file name to prevent collisions
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Create a signed URL for direct upload
    const [signedUrl] = await bucket.file(uniqueFileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    return NextResponse.json({
      uploadUrl: signedUrl,
      fileKey: uniqueFileName,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate upload URL" },
      { status: 500 }
    );
  }
} 