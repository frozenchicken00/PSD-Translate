const fs = require("fs/promises");
const { Storage } = require("@google-cloud/storage");
const ClientOAuth2 = require("client-oauth2");

// Adobe API Configuration
const imsConfig = {
  clientId: process.env.ADOBE_CLIENT_ID,
  clientSecret: process.env.ADOBE_CLIENT_SECRET,
};

// DeepL API Configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const TARGET_LANG = "ja";

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
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_KEYFILE,
  projectId: process.env.GCS_PROJECT_ID,
});
const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

/**
 * Generates an IMS token for Adobe API authentication using client-oauth2
 * @returns {Promise<string>} - The access token
 */
async function generateIMSToken() {
  try {
    const token = await adobeAuth.credentials.getToken();
    console.log("Generated IMS token:", token.accessToken);
    return token.accessToken;
  } catch (error) {
    throw new Error(`Failed to get IMS token: ${error.message}`);
  }
}

/**
 * Translates text using DeepL API
 * @param {string} text - The text to translate
 * @returns {Promise<string>} - The translated text
 */
async function translateText(text) {
  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: TARGET_LANG,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to translate text: ${await response.text()}`);
  }

  const data = await response.json();
  return data.translations[0]?.text || text;
}

/**
 * Uploads a file to Google Cloud Storage and returns a signed URL for reading
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name of the file in GCS
 * @returns {Promise<string>} - The signed URL for reading
 */
async function uploadToGCS(fileBuffer, fileName) {
  const file = bucket.file(fileName);
  await file.save(fileBuffer, {
    contentType: "image/vnd.adobe.photoshop",
  });

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
  });

  console.log(`Generated read signed URL for ${fileName}: ${signedUrl}`);
  return signedUrl;
}

/**
 * Generates a signed URL for writing to a file in GCS
 * @param {string} fileName - The name of the file in GCS
 * @returns {Promise<string>} - The signed URL for writing
 */
async function getWriteSignedUrl(fileName) {
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
async function postPhotoshopAPI(endpoint, apiKey, token, requestBody) {
  console.log("Sending request to:", endpoint);
  console.log("Headers:", {
    Authorization: `Bearer ${token}`,
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  });
  console.log("Body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log("API response:", response.status, responseText);

  if (!response.ok && response.status !== 202) {
    throw new Error(`Adobe API request failed: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

/**
 * Polls the Adobe API for the status of an operation
 * @param {string} pollingUrl - The polling URL from the initial response
 * @param {string} apiKey - API Key
 * @param {string} token - IMS Token
 * @param {string} type - Type of operation (e.g., "Manifest", "Translation")
 * @returns {Promise<any>}
 */
async function pollStatus(pollingUrl, apiKey, token, type = "operation") {
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 5000;

  while (attempts < maxAttempts) {
    const response = await fetch(pollingUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polling failed for ${type}: ${response.status} - ${errorText}`);
    }

    const body = await response.json();
    console.log(`${type} response:`, JSON.stringify(body, null, 2));

    // Check if outputs array exists and has at least one element
    if (body.outputs && body.outputs.length > 0) {
      const output = body.outputs[0];
      console.log(`${type} status:`, output.status || "unknown");

      // Check the nested status in outputs[0]
      if (output.status === "succeeded") {
        console.log(`${type} result:`, JSON.stringify(body, null, 2));
        return body;
      } else if (output.status === "failed") {
        throw new Error(`${type} failed: ${JSON.stringify(output.errors || body)}`);
      }
    } else {
      console.log(`${type} status: unknown (no outputs)`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    attempts++;
  }
  throw new Error(`Polling for ${type} timed out after ${maxAttempts} attempts`);
}

/**
 * Recursively finds all text layers in a layer array
 * @param {Array} layers - Array of layer objects
 * @returns {Array} - Array of textLayer objects
 */
function findTextLayers(layers) {
  const textLayers = [];
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
 * @param {string} apiKey - Adobe API Key
 * @param {Buffer} inputPsdBuffer - Buffer of the input PSD file
 * @param {string} fileName - Name of the input file
 * @returns {Promise<any>}
 */
async function getDocumentManifest(token, apiKey, inputPsdBuffer, fileName) {
  const gcsUrl = await uploadToGCS(inputPsdBuffer, fileName);
  const initialResponse = await postPhotoshopAPI(MANIFEST_ENDPOINT, apiKey, token, {
    inputs: [{ href: gcsUrl, storage: "external" }],
  });

  if (initialResponse._links?.self?.href) {
    return await pollStatus(initialResponse._links.self.href, apiKey, token, "Manifest");
  }
  return initialResponse; // Fallback for synchronous response
}

/**
 * Translates text layers in a PSD file and saves the translated version
 * @param {Buffer} inputPsdBuffer - Buffer of the input PSD file
 * @param {string} fileName - Name of the input file
 * @param {string} outputPsdPath - Path to save the translated PSD file
 */
async function translatePsd(inputPsdBuffer, fileName, outputPsdPath) {
  try {
    console.log("Authenticating with Adobe...");
    const accessToken = await generateIMSToken();

    console.log("Fetching PSD document manifest...");
    const manifest = await getDocumentManifest(accessToken, imsConfig.clientId, inputPsdBuffer, fileName);
    if (!manifest.outputs || !Array.isArray(manifest.outputs) || manifest.outputs.length === 0) {
      throw new Error("No outputs found in manifest response");
    }

    console.log("Manifest:", JSON.stringify(manifest, null, 2));
    const textLayers = findTextLayers(manifest.outputs[0].layers);
    if (textLayers.length === 0) {
      throw new Error("No text layers found in PSD; aborting translation.");
    }

    console.log("Found text layers:", JSON.stringify(textLayers, null, 2));
    console.log("Translating text layers...");

    // To handle a fewer number of requests, you can use Promise.all to translate all text layers at once

    // const translatedLayers = await Promise.all(
    //   textLayers.map(async (layer) => {
    //     const originalText = layer.text.content;
    //     const translatedText = await translateText(originalText);
    //     console.log(`Layer "${layer.name}":`);
    //     console.log(`  Original: ${originalText}`);
    //     console.log(`  Translated: ${translatedText}`);
        
    //     return {
    //       name: layer.name,
    //       text: {
    //         content: translatedText,
    //         // orientation: layer.text.orientation || "horizontal",
    //         // characterStyles: layer.text.characterStyles,
    //         // paragraphStyles: layer.text.paragraphStyles,
    //       },
    //     };
    //   })
    // );

    // To handle a large number of requesting, translate text layers sequentially with a delay

    const translatedLayers = [];
    for (const layer of textLayers) {
      const originalText = layer.text.content;
      const translatedText = await translateText(originalText);
      console.log(`Layer "${layer.name}":`);
      console.log(`  Original: ${originalText}`);
      console.log(`  Translated: ${translatedText}`);
      translatedLayers.push({
        name: layer.name,
        text: { content: translatedText },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("Sending translated layers to Adobe API...");
    const inputUrl = await uploadToGCS(inputPsdBuffer, fileName);
    const outputFileName = "output.psd";
    const outputUrl = await getWriteSignedUrl(outputFileName);
    const requestBody = {
      inputs: [{ href: inputUrl, storage: "external" }],
      options: { layers: translatedLayers },
      outputs: [
        {
          href: outputUrl,
          storage: "external",
          type: "vnd.adobe.photoshop",
        },
      ],
    };

    const response = await postPhotoshopAPI(TEXT_ENDPOINT, imsConfig.clientId, accessToken, requestBody);
    const result = await pollStatus(response._links.self.href, imsConfig.clientId, accessToken, "Translation");

    console.log("Downloading translated PSD...");
    await bucket.file(outputFileName).download({ destination: outputPsdPath });

    await Promise.all([bucket.file(fileName).delete(), bucket.file(outputFileName).delete()]);
    console.log(`Translation completed! File saved to: ${outputPsdPath}`);
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

module.exports = { translatePsd };

// Test execution
if (require.main === module) {
  (async () => {
    try {
      const inputPsdBuffer = await fs.readFile("./test.psd"); // Replace with your PSD path
      const fileName = "My First Project Example.psd";
      const outputPsdPath = "./output.psd";
      await translatePsd(inputPsdBuffer, fileName, outputPsdPath);
    } catch (error) {
      console.error("Test run failed:", error);
    }
  })();
}