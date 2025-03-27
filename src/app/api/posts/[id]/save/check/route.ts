import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// GET /api/posts/[id]/save/check - Check if the current user has saved the post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  const paramsData = await params;
  const postId = paramsData.id;

  // Check if user is authenticated
  if (!session?.user?.id) {
    return NextResponse.json(
      { saved: false },
      { status: 200 }
    );
  }

  try {
    // Check if the user has saved the post
    const { data: savedPost } = await handlePrismaOperation(() => 
      prisma.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    return NextResponse.json(
      { saved: !!savedPost },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking saved post:", error);
    return NextResponse.json(
      { saved: false, error: "Failed to check save status" },
      { status: 500 }
    );
  }
} 