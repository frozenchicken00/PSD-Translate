import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// POST /api/posts/[id]/like - Like a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  const paramsData = await params;
  const postId = paramsData.id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to like a post" },
      { status: 401 }
    );
  }

  try {
    // Check if the user has already liked the post
    const { data: existingLike } = await handlePrismaOperation(() =>
      prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    if (existingLike) {
      return NextResponse.json(
        { error: "You have already liked this post" },
        { status: 400 }
      );
    }

    // Create a new like
    const { data: newLike } = await handlePrismaOperation(() =>
      prisma.like.create({
        data: {
          userId: session.user?.id as string,
          postId,
        },
      })
    );

    // Get the updated like count
    const { data: likeCount } = await handlePrismaOperation(() =>
      prisma.like.count({
        where: { postId },
      })
    );

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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  const paramsData = await params;
  const postId = paramsData.id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to unlike a post" },
      { status: 401 }
    );
  }

  try {
    // Delete the like
    const { data: deletedLike } = await handlePrismaOperation(() =>
      prisma.like.delete({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    // Get the updated like count
    const { data: likeCount } = await handlePrismaOperation(() =>
      prisma.like.count({
        where: { postId },
      })
    );

    return NextResponse.json(
      { message: "Post unliked successfully", likes: likeCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unliking post:", error);
    
    // Check if the error is due to the like not existing
    return NextResponse.json(
      { error: "Failed to unlike post" },
      { status: 500 }
    );
  }
} 