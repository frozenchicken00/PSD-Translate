import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const pathParam = await params;
    const filePath = path.join(process.cwd(), 'public', 'images', 'uploads', ...pathParam.path);
    
    console.log(`Attempting to serve image from: ${filePath}`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File not found: ${filePath}`, error);
      
      // Fallback to a default image or return a 404
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type based on file extension
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream'; // Default
    
    if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    }
    
    console.log(`Serving image with content type: ${contentType}`);
    
    // Return the image with appropriate content type
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`Error serving image:`, error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
} 