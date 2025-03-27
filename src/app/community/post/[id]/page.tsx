'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Types
interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorImage?: string;
  date: string;
  likes: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  authorImage?: string;
  date: string;
  likes: number;
  comments: Comment[];
  tags: string[];
  images: string[];
}

interface RelatedPost {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  authorImage?: string;
  date: string;
  image?: string;
  likes: number;
  comments: number;
}

export default function PostPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  
  // Fetch post data
  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Post not found');
          }
          throw new Error('Failed to fetch post');
        }
        
        const postData = await response.json();
        
        // Ensure image URLs are properly formatted
        if (postData.images && Array.isArray(postData.images)) {
          // Images should already have proper URLs from the API
          console.log('Post images:', postData.images);
        }
        
        setPost(postData);
      } catch (err) {
        console.error(`Error fetching post with ID: ${postId}`, err);
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPost();
  }, [postId]);
  
  // Fetch related posts
  useEffect(() => {
    async function fetchRelatedPosts() {
      if (!post) return;
      
      try {
        setRelatedLoading(true);
        
        // Use post tags to find related content
        const tags = post.tags.join(',');
        const response = await fetch(`/api/posts?tag=${encodeURIComponent(tags)}&take=2&exclude=${postId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch related posts');
        }
        
        const data = await response.json();
        
        // Map the API response to the format we need
        const formattedPosts = data.posts.map((relatedPost: any) => ({
          id: relatedPost.id,
          title: relatedPost.title,
          author: relatedPost.author,
          date: relatedPost.date,
          image: relatedPost.image || '/images/placeholder.jpg',
          likes: relatedPost.likes,
          comments: relatedPost.comments
        }));
        
        setRelatedPosts(formattedPosts);
      } catch (error) {
        console.error('Error fetching related posts:', error);
        // Don't set an error state for related posts - it's not critical
        setRelatedPosts([]);
      } finally {
        setRelatedLoading(false);
      }
    }
    
    fetchRelatedPosts();
  }, [post, postId]);
  
  // Check if user has liked or saved the post
  useEffect(() => {
    if (!session || !post) return;
    
    async function checkUserInteractions() {
      try {
        // Check if user has liked the post
        const likeResponse = await fetch(`/api/posts/${postId}/like/check`);
        if (likeResponse.ok) {
          const { liked } = await likeResponse.json();
          setIsLiked(liked);
        }
        
        // Check if user has saved the post
        const saveResponse = await fetch(`/api/posts/${postId}/save/check`);
        if (saveResponse.ok) {
          const { saved } = await saveResponse.json();
          setIsSaved(saved);
        }
      } catch (error) {
        console.error('Error checking user interactions:', error);
      }
    }
    
    checkUserInteractions();
  }, [session, post, postId]);
  
  const handleLikeToggle = async () => {
    if (!session) {
      router.push('/signin?callbackUrl=' + encodeURIComponent(`/community/post/${postId}`));
      return;
    }
    
    try {
      setSubmittingAction('like');
      
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
      });
      
      if (!response.ok) {
        throw new Error('Failed to ' + (isLiked ? 'unlike' : 'like') + ' post');
      }
      
      const data = await response.json();
      
      // Update the post with new like count
      if (post) {
        setPost({
          ...post,
          likes: data.likes
        });
      }
      
      // Toggle liked state
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setSubmittingAction(null);
    }
  };
  
  const handleSaveToggle = async () => {
    if (!session) {
      router.push('/signin?callbackUrl=' + encodeURIComponent(`/community/post/${postId}`));
      return;
    }
    
    try {
      setSubmittingAction('save');
      
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/save`, {
        method,
      });
      
      if (!response.ok) {
        throw new Error('Failed to ' + (isSaved ? 'unsave' : 'save') + ' post');
      }
      
      // Toggle saved state
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Error toggling save:', err);
    } finally {
      setSubmittingAction(null);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || 'Shared Post',
        text: 'Check out this post on WebtoonTL Community',
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback - copy URL to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(() => alert('Failed to copy link'));
    }
  };
  
  const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!session) {
      router.push('/signin?callbackUrl=' + encodeURIComponent(`/community/post/${postId}`));
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      setSubmittingComment(true);
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to post comment');
      }
      
      const commentData = await response.json();
      
      // Update post with new comment
      if (post) {
        setPost({
          ...post,
          comments: [commentData, ...post.comments],
        });
      }
      
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const handleDeletePost = async () => {
    if (!session) {
      router.push('/signin?callbackUrl=' + encodeURIComponent(`/community/post/${postId}`));
      return;
    }

    // Confirm with the user
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      setSubmittingAction('delete');
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      router.push('/community');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete the post. Please try again.');
    } finally {
      setSubmittingAction(null);
    }
  };
  
  // Display loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Display error state
  if (error && !post) {
    return (
      <div className="py-10">
        <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Community
        </Link>
        
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  // Display post content
  if (!post) return null;

  return (
    <div className="post-detail">
      <div className="mb-6">
        <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Community
        </Link>
        
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
              {post.authorImage ? (
                <Image 
                  src={post.authorImage} 
                  alt={post.author} 
                  width={40} 
                  height={40}
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.textContent = post.author.charAt(0).toUpperCase();
                    }
                  }}
                />
              ) : (
                post.author.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="font-medium">{post.author}</div>
              <div className="text-sm text-muted-foreground">{post.date}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm bg-secondary/20 dark:bg-secondary/30 text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        {/* Post author actions */}
        {session?.user?.id === post.authorId && (
          <div className="flex gap-3 mb-6">
            <Link 
              href={`/community/post/${post.id}/edit`}
              className="bg-secondary/20 hover:bg-secondary/30 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-foreground px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Post
            </Link>
            <button 
              onClick={handleDeletePost}
              className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              disabled={submittingAction === 'delete'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {submittingAction === 'delete' ? (
                <span className="flex items-center">
                  <span className="animate-spin h-3 w-3 border-t-2 border-b-2 border-current rounded-full mr-2"></span>
                  Deleting...
                </span>
              ) : 'Delete Post'}
            </button>
          </div>
        )}
      </div>
      
      <div className="mb-8">
        <div 
          className="post-content prose dark:prose-invert max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {post.images.map((img, index) => (
              <div key={index} className="relative h-64 rounded-lg overflow-hidden border border-border">
                <img
                  src={img}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Failed to load image: ${img}`);
                    e.currentTarget.src = '/placeholder.jpg';
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-6 text-muted-foreground">
          <button 
            className={`flex items-center gap-1 hover:text-accent ${isLiked ? 'text-accent' : ''}`} 
            onClick={handleLikeToggle}
            disabled={submittingAction === 'like'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{post.likes} likes</span>
            {submittingAction === 'like' && (
              <span className="ml-1 animate-spin h-3 w-3 border-t-2 border-b-2 border-current rounded-full"></span>
            )}
          </button>
          <button 
            className="flex items-center gap-1 hover:text-accent"
            onClick={handleShare}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>
          <button 
            className={`flex items-center gap-1 hover:text-accent ${isSaved ? 'text-accent' : ''}`}
            onClick={handleSaveToggle}
            disabled={submittingAction === 'save'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
            {submittingAction === 'save' && (
              <span className="ml-1 animate-spin h-3 w-3 border-t-2 border-b-2 border-current rounded-full"></span>
            )}
          </button>
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-4">Comments ({post.comments.length})</h2>
        
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {session?.user?.image ? (
                <Image 
                  src={session.user.image} 
                  alt={session.user.name || "You"}
                  width={40} 
                  height={40}
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && session.user?.name) {
                      parent.textContent = session.user.name.charAt(0).toUpperCase();
                    } else if (parent) {
                      parent.textContent = "Y";
                    }
                  }}
                />
              ) : (
                <span>{session?.user?.name?.charAt(0).toUpperCase() || "Y"}</span>
              )}
            </div>
            <div className="flex-grow">
              <textarea
                className="w-full p-3 border border-border rounded-lg bg-secondary/10 dark:bg-gray-800 text-foreground resize-none min-h-24"
                placeholder={session ? "Add a comment..." : "Sign in to comment"}
                value={newComment}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                disabled={!session || submittingComment}
              />
              <div className="flex justify-end mt-2">
                <button 
                  type="submit"
                  disabled={!session || !newComment.trim() || submittingComment}
                  className="bg-primary hover:bg-accent text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? (
                    <span className="flex items-center">
                      <span className="mr-2">Posting</span>
                      <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    </span>
                  ) : (
                    'Post Comment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
        
        <div className="space-y-6">
          {post.comments.length > 0 ? (
            post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {comment.authorImage ? (
                    <Image 
                      src={comment.authorImage} 
                      alt={comment.author} 
                      width={40} 
                      height={40}
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.textContent = comment.author.charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    comment.author.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-grow">
                  <div className="bg-secondary/10 dark:bg-gray-800 p-4 rounded-lg mb-2 border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{comment.author}</span>
                        <span className="text-sm text-muted-foreground ml-2">{comment.date}</span>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground pl-2">
                    <button className="hover:text-accent">Like ({comment.likes})</button>
                    <button className="hover:text-accent">Reply</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-4">More from Community</h2>
        {relatedLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : relatedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedPosts.map(relatedPost => (
              <div key={relatedPost.id} className="border border-border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-panel dark:bg-panel flex">
                <div className="w-1/3 relative">
                  <Image
                    src={relatedPost.image || '/images/placeholder.jpg'}
                    alt={relatedPost.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.jpg';
                    }}
                  />
                </div>
                <div className="p-4 w-2/3">
                  <h3 className="text-lg font-bold mb-2 hover:text-accent">
                    <Link href={`/community/post/${relatedPost.id}`}>{relatedPost.title}</Link>
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{relatedPost.author}</span>
                    <span className="text-xs text-muted-foreground">{relatedPost.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {relatedPost.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {relatedPost.comments}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground border border-border rounded-lg">
            No related posts found.
          </div>
        )}
      </div>
    </div>
  );
} 