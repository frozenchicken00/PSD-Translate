'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

// Types for our data
interface Post {
  id: string;
  title: string;
  author: string;
  authorId: string;
  authorImage?: string;
  date: string;
  content: string;
  likes: number;
  comments: number;
  tags: string[];
  image?: string | null;
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filterTag, setFilterTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Common tags for filtering
  const commonTags = ['Korean', 'Japanese', 'Chinese', 'Tips', 'Collaboration'];
  
  // Fetch posts from API
  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const url = filterTag 
          ? `/api/posts?tag=${encodeURIComponent(filterTag)}`
          : '/api/posts';
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const data = await response.json();
        setPosts(data.posts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');

      } finally {
        setLoading(false);
      }
    }
    
    fetchPosts();
  }, [filterTag]);
  
  const filteredPosts = posts;
  
  return (
    <div className="community-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Community Forum</h1>
        <p className="text-lg mb-6">Connect with fellow translators, share your work, and discuss ideas!</p>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {commonTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  tag === filterTag ? 'bg-accent text-white' : 'bg-secondary/20 dark:bg-secondary/10 hover:bg-secondary/30 text-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <Link 
            href="/community/new-post" 
            className="bg-primary hover:bg-accent text-white dark:text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Create Post
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div key={post.id} className="border border-border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-panel dark:bg-panel">
              <div className="h-48 relative">
                <Image
                  src={post.image || '/images/placeholder.jpg'}
                  alt={post.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder.jpg';
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                  <div className="flex gap-1">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-secondary/20 dark:bg-secondary/30 text-secondary-foreground px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 hover:text-accent">
                  <Link href={`/community/post/${post.id}`}>{post.title}</Link>
                </h3>
                <p className="text-muted-foreground mb-4 line-clamp-3">{post.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-2 overflow-hidden">
                      {post.authorImage ? (
                        <Image 
                          src={post.authorImage}
                          alt={post.author}
                          width={32}
                          height={32}
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
                    <span className="font-medium">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {post.comments}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && !error && filteredPosts.length === 0 && (
        <div className="text-center py-16 bg-panel dark:bg-panel border border-border rounded-lg">
          <h3 className="text-xl font-bold mb-2">No posts found</h3>
          <p className="text-muted-foreground">Try selecting a different filter or create your own post!</p>
        </div>
      )}
    </div>
  );
} 