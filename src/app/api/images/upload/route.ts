import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, handlePrismaOperation } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  // Check authentication
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be logged in to upload images' },
      { status: 401 }
    );
  }
  
  try {
    // Parse the FormData from the request
    const formData = await req.formData();
    
    const imageUrls: string[] = [];
    
    // Process each file in the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value;
        
        // Generate a unique filename
        const timestamp = Date.now();
        const originalName = file.name;
        const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Store in database as a temporary image (not yet attached to a post)
        const { data: image } = await handlePrismaOperation(() => 
          prisma.postImage.create({
            data: {
              url: `/api/images/${safeName}`, // URL for the API endpoint that will serve this image
              blobData: buffer,
              mimeType: file.type,
              filename: originalName,
              postId: 'temp', // Will be replaced when associated with a post
            },
          })
        );
        
        if (image) {
          imageUrls.push(image.url);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      imageUrls,
      message: `${imageUrls.length} file(s) uploaded successfully` 
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
} 