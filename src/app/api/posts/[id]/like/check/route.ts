import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// GET /api/posts/[id]/like/check - Check if the current user has liked the post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const postId = (await params).id;

  // Check if user is authenticated
  if (!session?.user?.id) {
    return NextResponse.json(
      { liked: false },
      { status: 200 }
    );
  }

  try {
    // Check if the user has liked the post
    const { data: like } = await handlePrismaOperation(() => 
      prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    return NextResponse.json(
      { liked: !!like },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking post like:", error);
    return NextResponse.json(
      { liked: false, error: "Failed to check like status" },
      { status: 500 }
    );
  }
} 