import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@/auth';

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
    
    // Define both paths - one for file system and one for URL
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsPath = path.join('images', 'uploads');
    const uploadsDir = path.join(publicDir, uploadsPath);
    
    // Ensure the uploads directory exists
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log(`Uploads directory created/verified at: ${uploadsDir}`);
    } catch (error) {
      console.error(`Error creating uploads directory: ${error}`);
      return NextResponse.json({ error: 'Failed to create uploads directory' }, { status: 500 });
    }
    
    const imageUrls: string[] = [];
    
    // Process each file in the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value;
        
        // Create a safe filename with timestamp to avoid conflicts
        const timestamp = Date.now();
        const originalName = file.name;
        const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadsDir, safeName);
        
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Write file to disk
        try {
          await fs.writeFile(filePath, buffer);
          console.log(`File saved to: ${filePath}`);
          
          // Create URL path (using forward slashes for web URLs)
          const imageUrl = `/${uploadsPath.replace(/\\/g, '/')}/${safeName}`;
          imageUrls.push(imageUrl);
        } catch (error) {
          console.error(`Error writing file: ${error}`);
          return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
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