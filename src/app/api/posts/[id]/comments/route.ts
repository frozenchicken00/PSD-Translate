import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";
import { Prisma } from '@prisma/client';

// Define types to fix TypeScript errors
type Comment = {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    replies: number;
  };
};

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");

  try {
    // Check if post exists
    const { data: post } = await handlePrismaOperation(() => 
      prisma.post.findUnique({
        where: { id: postId },
      })
    );
    
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    
    // Query for comments
    const { data: rawComments } = await handlePrismaOperation(() => 
      prisma.comment.findMany({
        where: {
          postId,
          parentId: parentId || null,
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
      })
    );
    
    // Cast to correct type
    const comments = rawComments as Comment[];
    
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id: postId } = await params;

  if (!session?.user?.id) {
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
    const { data: post } = await handlePrismaOperation(() => 
      prisma.post.findUnique({
        where: { id: postId },
      })
    );
    
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    
    // If this is a reply, check if parent comment exists
    if (parentId) {
      const { data: rawParentComment } = await handlePrismaOperation(() => 
        prisma.comment.findUnique({
          where: { id: parentId },
        })
      );
      
      // Cast to correct type
      const parentComment = rawParentComment as { postId: string } | null;
      
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
    const { data: rawComment } = await handlePrismaOperation(() => 
      prisma.comment.create({
        data: {
          content,
          authorId: session.user!.id as string,
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
      })
    );
    
    // Cast to correct type
    const comment = rawComment as {
      id: string;
      content: string;
      createdAt: Date;
      author: {
        id: string;
        name: string | null;
        image: string | null;
      };
    };
    
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

const whereClause: Prisma.PostWhereInput = {
  // ...
}; 