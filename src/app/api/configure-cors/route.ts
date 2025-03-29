import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

// GCS Configuration
const storage = new Storage({
  credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) 
    : undefined,
  projectId: process.env.GCS_PROJECT_ID,
});

if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('GCS_BUCKET_NAME environment variable is not defined');
}
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export async function GET(req: NextRequest) {
  try {
    // Configure CORS
    await bucket.setCorsConfiguration([
      {
        origin: ["*"], // In production, restrict this to your domain
        method: ["PUT", "GET", "HEAD", "DELETE", "POST"],
        responseHeader: [
          "Content-Type",
          "Access-Control-Allow-Origin",
          "X-Requested-With",
          "Content-Disposition"
        ],
        maxAgeSeconds: 3600
      }
    ]);

    console.log("Successfully configured CORS for bucket:", process.env.GCS_BUCKET_NAME);

    return NextResponse.json({ 
      success: true,
      message: "CORS successfully configured" 
    });
  } catch (error) {
    console.error("Error configuring CORS:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
} 