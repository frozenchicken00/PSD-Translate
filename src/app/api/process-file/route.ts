import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import ClientOAuth2 from "client-oauth2";

// Adobe API Configuration
const imsConfig = {
  clientId: process.env.ADOBE_CLIENT_ID,
  clientSecret: process.env.ADOBE_CLIENT_SECRET,
};

// Check if Adobe credentials are defined
if (!imsConfig.clientId || !imsConfig.clientSecret) {
  throw new Error('Adobe API credentials (ADOBE_CLIENT_ID and ADOBE_CLIENT_SECRET) are required');
}

// DeepL API Configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEFAULT_TARGET_LANG = "EN";

// Adobe Endpoints
const TEXT_ENDPOINT = "https://image.adobe.io/pie/psdService/text";
const MANIFEST_ENDPOINT = "https://image.adobe.io/pie/psdService/documentManifest";

// OAuth2 Configuration for Adobe IMS
const adobeAuth = new ClientOAuth2({
  clientId: imsConfig.clientId,
  clientSecret: imsConfig.clientSecret,
  accessTokenUri: "https://ims-na1.adobelogin.com/ims/token/v3",
  scopes: ["AdobeID", "openid"],
});

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

/**
 * Generates an IMS token for Adobe API authentication using client-oauth2
 * @returns {Promise<string>} - The access token
 */
async function generateIMSToken() {
  try {
    const token = await adobeAuth.credentials.getToken();
    console.log("Generated IMS token:", token.accessToken);
    return token.accessToken;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get IMS token: ${errorMessage}`);
  }
}

/**
 * Translates text using DeepL API
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language code
 * @returns {Promise<string>} - The translated text
 */
async function translateText(text: string = "", targetLang = DEFAULT_TARGET_LANG) {
  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to translate text: ${await response.text()}`);
  }

  const data = await response.json();
  return data.translations[0]?.text || text;
}

/**
 * Generates a signed URL for writing to a file in GCS
 * @param {string} fileName - The name of the file in GCS
 * @returns {Promise<string>} - The signed URL for writing
 */
async function getWriteSignedUrl(fileName: string) {
  const file = bucket.file(fileName);
  const [signedUrl] = await file.getSignedUrl({
    action: "write",
    expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
    contentType: "image/vnd.adobe.photoshop",
  });

  console.log(`Generated write signed URL for ${fileName}: ${signedUrl}`);
  return signedUrl;
}

/**
 * Sends a request to Adobe Photoshop API
 * @param {string} endpoint - Adobe API endpoint
 * @param {string} apiKey - API Key
 * @param {string} token - IMS Token
 * @param {object} requestBody - Request payload
 * @returns {Promise<any>}
 */
async function postPhotoshopAPI(endpoint:string, apiKey:string, token:string, requestBody:object) {
  console.log("Sending request to:", endpoint);
  
  // Add retry logic for transient errors
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log("API response:", response.status, responseText);

      // For retryable errors
      if (!response.ok && (response.status === 429 || (response.status >= 500 && response.status < 600))) {
        if (retryCount < maxRetries) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(Math.pow(2, retryCount) * 1000, 10000);
          
          console.log(`Retryable error (${response.status}), retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
      }
      
      // For non-retryable errors or max retries reached
      if (!response.ok && response.status !== 202) {
        throw new Error(`Adobe API request failed: ${response.status} - ${responseText}`);
      }

      // Try to parse JSON, with fallback for empty responses
      try {
        return responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        throw new Error(`Invalid JSON response from Adobe API: ${responseText}`);
      }
    } catch (error) {
      lastError = error;
      
      // Handle abort/timeout errors
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log(`Request to ${endpoint} timed out`);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying after timeout (attempt ${retryCount}/${maxRetries})...`);
          continue;
        }
      }
      
      // Handle network errors (retry)
      if (error instanceof TypeError && (error.message.includes('network') || error.message.includes('failed'))) {
        if (retryCount < maxRetries) {
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
          console.log(`Network error, retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
      }
      
      // Rethrow after max retries
      throw error;
    }
  }
  
  // If we've exhausted retries, throw the last error
  throw lastError || new Error(`Failed to complete request to ${endpoint} after ${maxRetries} retries`);
}

/**
 * Polls the Adobe API for the status of an operation
 * @param {string} pollingUrl - The polling URL from the initial response
 * @param {string} apiKey - API Key
 * @param {string} token - IMS Token
 * @param {string} type - Type of operation (e.g., "Manifest", "Translation")
 * @returns {Promise<any>}
 */
async function pollStatus(pollingUrl:string, apiKey:string, token:string, type = "operation") {
  let attempts = 0;
  const maxAttempts = 20;
  const initialDelay = 5000;
  let delay = initialDelay;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`Polling attempt ${attempts+1}/${maxAttempts} for ${type} status...`);
      
      const response = await fetch(pollingUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status >= 500) {
          consecutiveErrors++;
          console.log(`Server error (${response.status}), consecutive errors: ${consecutiveErrors}`);
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Too many consecutive errors polling for ${type}: ${response.status} - ${errorText}`);
          }
          
          delay = Math.min(delay * 1.5, 30000); // Cap at 30 seconds
        } else {
          throw new Error(`Polling failed for ${type}: ${response.status} - ${errorText}`);
        }
      } else {
        consecutiveErrors = 0;
        delay = initialDelay;
        
        const body = await response.json();
        console.log(`${type} response:`, JSON.stringify(body, null, 2));

        if (body.outputs && body.outputs.length > 0) {
          const output = body.outputs[0];
          console.log(`${type} status:`, output.status || "unknown");

          if (output.status === "succeeded") {
            console.log(`${type} result:`, JSON.stringify(body, null, 2));
            return body;
          } else if (output.status === "failed") {
            throw new Error(`${type} failed: ${JSON.stringify(output.errors || body)}`);
          }
        }
      }

      console.log(`Waiting ${delay}ms before next poll attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log(`Polling request for ${type} timed out, retrying...`);
        attempts++;
        continue;
      }
      
      throw error;
    }
  }
  throw new Error(`Polling for ${type} timed out after ${maxAttempts} attempts`);
}

/**
 * Recursively finds all text layers in a layer array
 * @param {Array} layers - Array of layer objects
 * @returns {Array} - Array of textLayer objects
 */
interface Layer {
  type: string;
  name: string;
  text?: {
    content: string;
  };
  children?: Layer[];
}

function findTextLayers(layers: Layer[]): Layer[] {
  const textLayers: Layer[] = [];
  if (!layers || !Array.isArray(layers)) return textLayers;

  for (const layer of layers) {
    if (layer.type === "textLayer") {
      textLayers.push(layer);
    }
    if (layer.children && Array.isArray(layer.children)) {
      textLayers.push(...findTextLayers(layer.children));
    }
  }
  return textLayers;
}

/**
 * Fetches the PSD document manifest from Adobe API
 * @param {string} token - IMS Token
 * @param {string} apiKey - API Key
 * @param {string} gcsUrl - URL of the file in GCS
 * @returns {Promise<any>}
 */
async function getDocumentManifest(token:string, apiKey:string, gcsUrl:string) {
  try {
    if (!token || !apiKey) {
      throw new Error("Missing required authentication parameters");
    }
    
    if (!gcsUrl || !gcsUrl.startsWith('https://')) {
      throw new Error("Invalid GCS URL provided");
    }
    
    const initialResponse = await postPhotoshopAPI(MANIFEST_ENDPOINT, apiKey, token, {
      inputs: [{ 
        href: gcsUrl, 
        storage: "external",
        type: "image/vnd.adobe.photoshop"
      }]
    });

    if (!initialResponse) {
      throw new Error("Empty response from Adobe API");
    }

    if (initialResponse._links?.self?.href) {
      return await pollStatus(initialResponse._links.self.href, apiKey, token, "Manifest");
    }
    
    if (initialResponse.error || initialResponse.code) {
      throw new Error(`API Error: ${initialResponse.error || initialResponse.code}: ${initialResponse.message || JSON.stringify(initialResponse)}`);
    }
    
    return initialResponse;
  } catch (error) {
    console.error("Document manifest error:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, targetLang = DEFAULT_TARGET_LANG, fileUrl } = await req.json();
    
    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    
    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    }
    
    // Ensure consistent filename formatting
    const sanitizedFileName = fileName.replace(/\s+/g, '-').toLowerCase();
    const outputFileName = sanitizedFileName.replace('.psd', '-translated.psd');

    // Translate PSD
    console.log("Authenticating with Adobe...");
    
    if (!imsConfig.clientId) {
      return NextResponse.json({ error: "Missing Adobe API client ID configuration" }, { status: 500 });
    }
    
    let accessToken;
    try {
      accessToken = await generateIMSToken();
      if (!accessToken) {
        return NextResponse.json({ error: "Failed to obtain Adobe authentication token" }, { status: 500 });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json({ 
        error: "Authentication failed with Adobe services", 
        details: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }

    console.log("Fetching PSD document manifest...");
    let manifest;
    try {
      manifest = await getDocumentManifest(accessToken, imsConfig.clientId!, fileUrl);
    } catch (error) {
      console.error("Document manifest error:", error);
      
      if (error instanceof Error && error.message.includes("400")) {
        return NextResponse.json({ 
          error: "Invalid PSD file or format not supported by Adobe API", 
          details: error.message 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: "Failed to process PSD file with Adobe services", 
        details: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }
    
    if (!manifest.outputs || !Array.isArray(manifest.outputs) || manifest.outputs.length === 0) {
      return NextResponse.json({ error: "No outputs found in manifest response" }, { status: 500 });
    }

    console.log("Processing manifest...");
    const textLayers = findTextLayers(manifest.outputs[0].layers);
    if (textLayers.length === 0) {
      return NextResponse.json({ 
        error: "No text layers found in PSD; nothing to translate", 
        status: "completed" 
      }, { status: 200 });
    }

    console.log("Found text layers:", JSON.stringify(textLayers, null, 2));
    console.log("Translating text layers...");
    const translatedLayers = [];
    for (const layer of textLayers) {
      const originalText = layer.text?.content || '';
      const translatedText = await translateText(originalText, targetLang);
      console.log(`Layer "${layer.name}":`);
      console.log(`  Original: ${originalText}`);
      console.log(`  Translated: ${translatedText}`);
      translatedLayers.push({
        name: layer.name,
        text: { content: translatedText },
      });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
    }

    console.log("Sending translated layers to Adobe API...");
    const outputUrl = await getWriteSignedUrl(outputFileName);
    const requestBody = {
      inputs: [{ href: fileUrl, storage: "external" }],
      options: { layers: translatedLayers },
      outputs: [
        {
          href: outputUrl,
          storage: "external",
          type: "vnd.adobe.photoshop",
        },
      ],
    };

    const response = await postPhotoshopAPI(TEXT_ENDPOINT, imsConfig.clientId!, accessToken, requestBody);
    await pollStatus(response._links.self.href, imsConfig.clientId!, accessToken, "Translation");

    // Add a short delay to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
    
    // Verify the translated file exists in GCS before generating the signed URL
    const [exists] = await bucket.file(outputFileName).exists();
    if (!exists) {
      throw new Error(`Translated file ${outputFileName} not found in storage`);
    }
    
    // Validate file by checking size
    const [fileMetadata] = await bucket.file(outputFileName).getMetadata();
    const fileSize = fileMetadata.size ? parseInt(String(fileMetadata.size)) : 0;
    console.log(`Verified ${outputFileName}, size: ${fileSize} bytes`);
    
    if (fileSize < 100) {
      throw new Error(`Translated file ${outputFileName} appears to be invalid (too small: ${fileSize} bytes)`);
    }

    // Generate signed URL for download with longer expiration
    const [signedUrl] = await bucket.file(outputFileName).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      responseDisposition: `attachment; filename="${outputFileName}"`,
    });

    console.log(`Final download URL: ${signedUrl}`);

    // Schedule deletion after 30 minutes
    setTimeout(async () => {
      try {
        await bucket.file(outputFileName).delete();
        console.log(`Deleted ${outputFileName} from GCS`);
      } catch (err) {
        console.error(`Failed to delete ${outputFileName}:`, err);
      }
    }, 30 * 60 * 1000);

    return NextResponse.json({ 
      downloadUrl: signedUrl,
      filename: outputFileName,
      size: fileSize,
      status: "success"
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
} 