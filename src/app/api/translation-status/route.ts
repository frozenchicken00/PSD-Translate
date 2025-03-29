import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: "jobId parameter is required" }, { status: 400 });
    }
    
    // In a real implementation, you would query your database for the job status
    // For now, simulate a response
    
    // Mock response - replace with actual database query in production
    const mockStatus = {
      jobId,
      status: "completed", // Options: processing, completed, failed
      progress: 100,
      downloadUrl: jobId ? `https://storage.googleapis.com/your-bucket/translated-${jobId}.psd` : null,
      error: null
    };
    
    return NextResponse.json(mockStatus);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get translation status" },
      { status: 500 }
    );
  }
} 