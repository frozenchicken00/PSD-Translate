import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma, handlePrismaOperation } from "@/lib/db";

// GET /api/posts - Get all posts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const take = parseInt(searchParams.get("take") || "10");
  const skip = parseInt(searchParams.get("skip") || "0");
  const excludeId = searchParams.get("exclude");

  try {
    // Base query
    const whereClause: Prisma.PostWhereInput = {
      published: true,
    };

    // Add tag filter if provided
    if (tag) {
      whereClause.tags = {
        some: {
          name: tag,
        },
      };
    }

    // Exclude specific post if specified
    if (excludeId) {
      whereClause.id = {
        not: excludeId
      };
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: whereClause,
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
            comments: true,
            likes: true,
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
          },
          take: 1, // Just get the first image for the card preview
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    });

    // Get total count for pagination
    const totalPosts = await prisma.post.count({
      where: whereClause,
    });

    // Transform the posts to match the frontend expected format
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author.name || "Anonymous",
      authorId: post.author.id,
      authorImage: post.author.image,
      date: post.createdAt.toISOString().split("T")[0],
      likes: post._count.likes,
      comments: post._count.comments,
      tags: post.tags.map((tag) => tag.name),
      image: post.images.length > 0 ? post.images[0].url : null,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      totalPosts,
      hasMore: skip + take < totalPosts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create a new post
export async function POST(req: NextRequest) {
  const session = await auth();

  // Check authentication
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to create a post" },
      { status: 401 }
    );
  }

  try {
    const { title, content, tags, imageUrls } = await req.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const createData: Record<string, unknown> = {
      title,
      content,
      authorId: session.user.id as string,
      tags: {
        create: tags.map((tag: string) => ({
          name: tag,
        })),
      },
    };

    // If there are image URLs, update the image records to associate with this post
    if (imageUrls && imageUrls.length > 0) {
      const { data: existingImages } = await handlePrismaOperation(() => 
        prisma.postImage.findMany({
          where: {
            url: {
              in: imageUrls,
            },
          },
        })
      );

      if (existingImages && existingImages.length > 0) {
        // Update the temporary images to connect them to this post
        for (const image of existingImages) {
          await handlePrismaOperation(() => 
            prisma.postImage.update({
              where: { id: image.id },
              data: { postId: 'pending' }, // We'll update this after the post is created
            })
          );
        }
      }
    }

    // Create post with tags
    const { data: post } = await handlePrismaOperation(() => 
      prisma.post.create({
        data: createData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          tags: true,
          images: true,
        },
      })
    );

    if (post && imageUrls && imageUrls.length > 0) {
      // Now update the images with the actual post ID
      await handlePrismaOperation(() => 
        prisma.postImage.updateMany({
          where: {
            url: {
              in: imageUrls,
            },
            postId: 'pending',
          },
          data: {
            postId: post.id,
          },
        })
      );

      // Fetch the updated post with images
      const { data: updatedPost } = await handlePrismaOperation(() => 
        prisma.post.findUnique({
          where: { id: post.id },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            tags: true,
            images: true,
          },
        })
      );

      return NextResponse.json(updatedPost, { status: 201 });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
} 