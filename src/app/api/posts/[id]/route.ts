import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// Define Post type to fix TypeScript errors
type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  tags: {
    name: string;
  }[];
  images: {
    url: string;
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
    _count: {
      likes: number;
    };
  }[];
  _count: {
    likes: number;
  };
  authorId?: string;
};

// GET /api/posts/[id] - Get a single post by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const postId = (await params).id;

  try {
    // Fetch the post with related data
    const { data: rawPost } = await handlePrismaOperation(() =>
      prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          tags: {
            select: {
              name: true,
            },
          },
          images: {
            select: {
              url: true,
            },
          },
          comments: {
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
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      })
    );

    // Cast to proper type
    const post = rawPost as Post | null;

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Format the post data to match the expected format on the frontend
    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author.name || "Anonymous",
      authorId: post.author.id,
      authorImage: post.author.image,
      date: post.createdAt.toISOString().split("T")[0],
      likes: post._count.likes,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: comment.author.name || "Anonymous",
        authorId: comment.author.id,
        authorImage: comment.author.image,
        date: comment.createdAt.toISOString().split("T")[0],
        likes: comment._count.likes,
      })),
      tags: post.tags.map((tag) => tag.name),
      images: post.images.map((image) => image.url),
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error(`Error fetching post with ID: ${postId}`, error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// PATCH /api/posts/[id] - Update a post
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const postId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to update a post" },
      { status: 401 }
    );
  }

  try {
    // Get the post to check ownership
    const { data: rawPost } = await handlePrismaOperation(() =>
      prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      })
    );

    // Cast to proper type
    const post = rawPost as { authorId: string } | null;

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the author
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    // Get update data from request
    const { title, content, tags, imageUrls } = await req.json();

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    // Update the post
    const { data: updatedPost } = await handlePrismaOperation(async () => {
      // Start with the basic update
      const updated = await prisma.post.update({
        where: { id: postId },
        data: updateData,
      });

      // Handle tags if provided - delete existing and create new
      if (tags !== undefined) {
        // Delete existing tags
        await prisma.postTag.deleteMany({
          where: { postId },
        });

        // Create new tags
        if (tags.length > 0) {
          await prisma.postTag.createMany({
            data: tags.map((tag: string) => ({
              name: tag,
              postId,
            })),
          });
        }
      }

      // Handle images if provided - delete existing and create new
      if (imageUrls !== undefined) {
        // Delete existing images
        await prisma.postImage.deleteMany({
          where: { postId },
        });

        // Create new images
        if (imageUrls.length > 0) {
          await prisma.postImage.createMany({
            data: imageUrls.map((url: string) => ({
              url,
              postId,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({
      message: "Post updated successfully",
      postId: updatedPost?.id || postId,
    });
  } catch (error) {
    console.error(`Error updating post with ID: ${postId}`, error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const postId = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to delete a post" },
      { status: 401 }
    );
  }

  try {
    // Get the post to check ownership
    const { data: rawPost } = await handlePrismaOperation(() =>
      prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      })
    );

    // Cast to proper type
    const post = rawPost as { authorId: string } | null;

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the author
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    // Delete the post (this will cascade delete related entities)
    const { data: deletedPost } = await handlePrismaOperation(() =>
      prisma.post.delete({
        where: { id: postId },
      })
    );

    return NextResponse.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error(`Error deleting post with ID: ${postId}`, error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
} 