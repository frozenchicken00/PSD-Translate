import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// POST /api/posts/[id]/save - Save a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  const paramsData = await params;
  const postId = paramsData.id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to save a post" },
      { status: 401 }
    );
  }

  try {
    // Check if the user has already saved the post
    const { data: existingSave } = await handlePrismaOperation(() =>
      prisma.savedPost.findUnique({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    if (existingSave) {
      return NextResponse.json(
        { error: "You have already saved this post" },
        { status: 400 }
      );
    }

    // Create a new saved post
    const { data: _newSavedPost } = await handlePrismaOperation(() =>
      prisma.savedPost.create({
        data: {
          userId: session.user?.id as string,
          postId,
        },
      })
    );

    return NextResponse.json(
      { message: "Post saved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving post:", error);
    return NextResponse.json(
      { error: "Failed to save post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/save - Unsave a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  const paramsData = await params;
  const postId = paramsData.id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to unsave a post" },
      { status: 401 }
    );
  }

  try {
    // Delete the saved post
    const { data: _deletedSavedPost } = await handlePrismaOperation(() =>
      prisma.savedPost.delete({
        where: {
          userId_postId: {
            userId: session.user?.id as string,
            postId,
          },
        },
      })
    );

    return NextResponse.json(
      { message: "Post unsaved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unsaving post:", error);
    
    // Check if error is due to the saved post not existing
    return NextResponse.json(
      { error: "Failed to unsave post" },
      { status: 500 }
    );
  }
} 