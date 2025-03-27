import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from '@prisma/client';

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params;
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  
  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    
    // Query for comments
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: parentId || null, // If parentId is provided, get replies, otherwise get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    // Format comments for API response
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      author: comment.author.name || "Anonymous",
      authorId: comment.author.id,
      authorImage: comment.author.image,
      date: comment.createdAt.toISOString().split("T")[0],
      likes: comment._count.likes,
      replyCount: comment._count.replies,
    }));
    
    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/comments - Add a comment to a post
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const { id: postId } = params;
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: "You must be logged in to comment" },
      { status: 401 }
    );
  }
  
  try {
    const { content, parentId } = await req.json();
    
    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    
    // If this is a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      
      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
      
      // Ensure parent comment belongs to the same post
      if (parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "Parent comment does not belong to this post" },
          { status: 400 }
        );
      }
    }
    
    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id as string,
        postId,
        ...(parentId && { parentId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
    
    // Format comment for API response
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      author: comment.author.name || "Anonymous",
      authorId: comment.author.id,
      authorImage: comment.author.image,
      date: comment.createdAt.toISOString().split("T")[0],
      likes: 0,
      replyCount: 0,
    };
    
    return NextResponse.json(formattedComment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

const _whereClause: Prisma.PostWhereInput = {
  // ...
}; 