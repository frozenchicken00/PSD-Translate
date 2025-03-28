import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// POST /api/posts/[id]/like - Like a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const postId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to like a post" },
      { status: 401 }
    );
  }

  try {
    // Upsert the like - this will create a like if it doesn't exist or do nothing if it does
    const { data } = await handlePrismaOperation(async () => {
      // First try to create the like
      try {
        const like = await prisma.like.create({
          data: {
            userId: session.user?.id as string,
            postId,
          },
        });
        return { created: true, like };
      } catch (error) {
        // If creation fails due to unique constraint, the like already exists
        return { created: false };
      }
    });

    // Ensure data is not null
    const result = data || { created: false };

    // Get the updated like count
    const { data: likeCount } = await handlePrismaOperation(() =>
      prisma.like.count({
        where: { postId },
      })
    );

    if (!result.created) {
      return NextResponse.json(
        { message: "You have already liked this post", likes: likeCount },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Post liked successfully", likes: likeCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error liking post:", error);
    return NextResponse.json(
      { error: "Failed to like post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/like - Unlike a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const postId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to unlike a post" },
      { status: 401 }
    );
  }

  try {
    // Try to delete the like, and catch the error if it doesn't exist
    const { data } = await handlePrismaOperation(async () => {
      try {
        const deletedLike = await prisma.like.delete({
          where: {
            userId_postId: {
              userId: session.user?.id as string,
              postId,
            },
          },
        });
        return { deleted: true };
      } catch (error) {
        // If delete fails, the like doesn't exist
        return { deleted: false };
      }
    });

    // Ensure data is not null
    const result = data || { deleted: false };

    // Get the updated like count
    const { data: likeCount } = await handlePrismaOperation(() =>
      prisma.like.count({
        where: { postId },
      })
    );

    if (!result.deleted) {
      return NextResponse.json(
        { message: "You haven't liked this post", likes: likeCount },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Post unliked successfully", likes: likeCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unliking post:", error);
    return NextResponse.json(
      { error: "Failed to unlike post" },
      { status: 500 }
    );
  }
} 