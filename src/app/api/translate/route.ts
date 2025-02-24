import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { translatePsd } from "@/translate";

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await req.formData();
    const fileField = formData.get("psd");

    // Validate the file
    if (!(fileField instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert the file to a buffer
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = fileField.name;

    // Define output path
    const outputPsdPath = path.join(process.cwd(), "public", "output.psd");

    // Call the translation function
    await translatePsd(buffer, fileName, outputPsdPath);

    // Return the download URL
    return NextResponse.json({ downloadUrl: "/output.psd" });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Optional: Specify runtime (default is "nodejs" in Next.js, but explicit for clarity)
export const runtime = "nodejs";