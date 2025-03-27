import { NextRequest, NextResponse } from 'next/server';
import { prisma, handlePrismaOperation } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Don't cache this route

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Create the URL path that was stored in the database
    const urlPath = `/api/images/${filename}`;
    
    // Find the image by URL
    const { data: image } = await handlePrismaOperation(() => 
      prisma.postImage.findFirst({
        where: {
          url: urlPath,
        },
      })
    );
    
    if (!image || !image.blobData) {
      console.error(`Image not found for URL: ${urlPath}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Return the image with the correct content type
    return new NextResponse(image.blobData, {
      headers: {
        'Content-Type': image.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}