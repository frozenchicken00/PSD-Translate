import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import ClientOAuth2 from "client-oauth2";

// Adobe API Configuration
const imsConfig = {
  clientId: process.env.ADOBE_CLIENT_ID,
  clientSecret: process.env.ADOBE_CLIENT_SECRET,
};

// OAuth2 Configuration for Adobe IMS
const adobeAuth = new ClientOAuth2({
  clientId: imsConfig.clientId,
  clientSecret: imsConfig.clientSecret,
  accessTokenUri: "https://ims-na1.adobelogin.com/ims/token/v3",
  scopes: ["AdobeID", "openid"],
});

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
 * Generates an IMS token for Adobe API authentication
 * @returns {Promise<string>} - The access token
 */
async function generateIMSToken() {
  try {
    const token = await adobeAuth.credentials.getToken();
    return token.accessToken;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get IMS token: ${errorMessage}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileKey, targetLang = "EN" } = await req.json();
    
    if (!fileKey) {
      return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
    }
    
    // Store the translation job in your database (you'll need to implement this)
    const jobId = Date.now().toString();
    
    // Start async processing (this should be moved to a queue or background worker in production)
    processTranslation(jobId, fileKey, targetLang).catch(error => {
      console.error(`Translation job ${jobId} failed:`, error);
      // Update job status in database as failed
    });
    
    return NextResponse.json({
      jobId,
      status: "processing",
      message: "Translation job started"
    });
  } catch (error) {
    console.error("Failed to start translation job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start translation" },
      { status: 500 }
    );
  }
}

/**
 * Background process to handle translation
 * In production, this should be moved to a separate worker/queue system
 */
async function processTranslation(jobId: string, fileKey: string, targetLang: string) {
  try {
    console.log(`Starting translation job ${jobId} for file ${fileKey}`);
    
    // Get Adobe API token
    const accessToken = await generateIMSToken();
    
    // Continue with existing translation logic from your route.ts file
    // You'll need to adapt the code to use the fileKey instead of uploading the file

    // Once processing is complete, store results and update job status
    console.log(`Translation job ${jobId} completed successfully`);
    
    // In production, you would update a database record with the job status and result URL
  } catch (error) {
    console.error(`Translation job ${jobId} failed:`, error);
    // Update job status as failed in your database
  }
} 