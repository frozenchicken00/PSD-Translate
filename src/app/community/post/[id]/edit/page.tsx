'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Tag options for the dropdown
const TAG_OPTIONS = [
  'Korean', 'Japanese', 'Chinese', 'English',
  'Comedy', 'Drama', 'Action', 'Romance',
  'Tips', 'Help Wanted', 'Showcase', 'Collaboration', 
  'Completed', 'In Progress', 'Resource'
];

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, status } = useSession();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{title?: string; content?: string; auth?: string; form?: string; permission?: string}>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [_uploadingFiles, setUploadingFiles] = useState(false);
  
  // Fetch post data on component mount
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch post');
        }
        
        const post = await response.json();
        
        // Check if the current user is the author
        if (session?.user?.id !== post.authorId) {
          setErrors({ permission: 'You do not have permission to edit this post' });
          return;
        }
        
        // Set form data
        setTitle(post.title);
        setContent(post.content);
        setTags(post.tags || []);
        setExistingImages(post.images || []);
      } catch (error) {
        console.error('Error fetching post:', error);
        setErrors({ form: 'Failed to load post data' });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session) {
      fetchPost();
    }
  }, [postId, session]);
  
  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push(`/signin?callbackUrl=/community/post/${postId}/edit`);
    return null;
  }
  
  // Show error if user doesn't have permission
  if (errors.permission) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Link href={`/community/post/${postId}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Post
        </Link>
        
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Permission Denied</h2>
          <p>{errors.permission}</p>
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-center">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
        <p>Loading post data...</p>
      </div>
    );
  }
  
  const handleTagChange = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };
  
  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(url => url !== imageUrl));
  };
  
  const uploadImages = async (files: FileList): Promise<string[]> => {
    try {
      setUploadingFiles(true);
      
      const formData = new FormData();
      
      // Add all files to FormData
      Array.from(files).forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });
      
      // Upload files to our API route that stores in database
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }
      
      const data = await response.json();
      setUploadProgress(100); // Set progress to 100% when complete
      
      return data.imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingFiles(false);
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: {title?: string; content?: string; auth?: string} = {};
    let isValid = true;
    
    if (!session) {
      newErrors.auth = 'You must be logged in to edit a post';
      isValid = false;
    }
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    
    if (!content.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrors({});
      
      // Upload any new files
      let allImageUrls = [...existingImages];
      
      if (files && files.length > 0) {
        const newImageUrls = await uploadImages(files);
        allImageUrls = [...allImageUrls, ...newImageUrls];
      }
      
      // Send the update request
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          tags,
          imageUrls: allImageUrls,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }
      
      // Redirect to the updated post
      router.push(`/community/post/${postId}`);
    } catch (error) {
      console.error('Error updating post:', error);
      setErrors({ 
        form: error instanceof Error ? error.message : 'Failed to update post'
      });
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link href={`/community/post/${postId}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Post
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Edit Post</h1>
      
      {errors.form && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          {errors.form}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block font-medium mb-1">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border rounded-lg bg-background"
            disabled={isSubmitting}
          />
          {errors.title && <p className="text-red-500 mt-1">{errors.title}</p>}
        </div>
        
        <div>
          <label htmlFor="content" className="block font-medium mb-1">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border rounded-lg bg-background min-h-40"
            disabled={isSubmitting}
          />
          {errors.content && <p className="text-red-500 mt-1">{errors.content}</p>}
        </div>
        
        <div>
          <label className="block font-medium mb-1">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagChange(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  tags.includes(tag)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block font-medium mb-1">Images</label>
          
          {/* Existing images */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Current images:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
                      <Image 
                        src={imageUrl} 
                        alt={`Image ${index + 1}`} 
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        className="object-cover" 
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(imageUrl)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSubmitting}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Upload new images */}
          <div>
            <input
              type="file"
              id="images"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              accept="image/*"
              multiple
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can select multiple images to upload
            </p>
          </div>
          
          {/* Upload progress bar */}
          {isSubmitting && files && files.length > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uploading: {uploadProgress}%
              </p>
            </div>
          )}
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="mr-2">Updating...</span>
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              </span>
            ) : (
              'Update Post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 