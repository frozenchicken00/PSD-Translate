'use client';

import { useState, FormEvent, ChangeEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Tag options for the dropdown
const TAG_OPTIONS = [
  'Korean', 'Japanese', 'Chinese', 'English',
  'Comedy', 'Drama', 'Action', 'Romance',
  'Tips', 'Help Wanted', 'Showcase', 'Collaboration', 
  'Completed', 'In Progress', 'Resource'
];

export default function NewPostPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{title?: string; content?: string; auth?: string; form?: string}>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/signin?callbackUrl=/community/new-post');
    return null;
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
      newErrors.auth = 'You must be logged in to create a post';
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
      
      // Upload images if there are any
      let imageUrls: string[] = [];
      if (files && files.length > 0) {
        imageUrls = await uploadImages(files);
      }
      
      // Prepare post data
      const postData = {
        title,
        content,
        tags,
        imageUrls
      };
      
      // Submit to API
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
      
      // On success, redirect to the community page
      router.push('/community');
      
    } catch (error) {
      console.error('Error creating post:', error);
      setErrors(prev => ({
        ...prev,
        form: error instanceof Error ? error.message : 'An unknown error occurred'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="new-post-page">
      <div className="mb-6">
        <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Community
        </Link>
        
        <h1 className="text-3xl font-bold mb-4">Create New Post</h1>
        <p className="text-muted-foreground mb-6">Share your translation work, ask questions, or discuss ideas with the community.</p>
      </div>
      
      {errors.auth && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          {errors.auth}
        </div>
      )}
      
      {errors.form && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          {errors.form}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-lg font-medium mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            placeholder="Give your post a descriptive title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full p-3 border rounded-lg bg-secondary/10 dark:bg-gray-800 text-foreground ${
              errors.title ? 'border-red-500' : 'border-border'
            }`}
            disabled={isSubmitting}
          />
          {errors.title && (
            <p className="mt-1 text-red-500 text-sm">{errors.title}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="content" className="block text-lg font-medium mb-2">
            Content
          </label>
          <textarea
            id="content"
            placeholder="Share your thoughts, questions, or experiences..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className={`w-full p-3 border rounded-lg bg-secondary/10 dark:bg-gray-800 text-foreground resize-none ${
              errors.content ? 'border-red-500' : 'border-border'
            }`}
            disabled={isSubmitting}
          />
          {errors.content && (
            <p className="mt-1 text-red-500 text-sm">{errors.content}</p>
          )}
        </div>
        
        <div>
          <label className="block text-lg font-medium mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagChange(tag)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  tags.includes(tag) 
                    ? 'bg-primary text-white' 
                    : 'bg-secondary/20 dark:bg-secondary/10 text-foreground'
                }`}
                disabled={isSubmitting}
              >
                {tag}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Select tags that best describe your post. This will help others find your content.
          </p>
        </div>
        
        <div>
          <label className="block text-lg font-medium mb-2">
            Images (Optional)
          </label>
          <input
            type="file"
            id="images"
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
            disabled={isSubmitting || uploadingFiles}
          />
          <label
            htmlFor="images"
            className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-secondary/5 dark:hover:bg-gray-800/50"
          >
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 font-medium">
                Click to upload images
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          </label>
          
          {files && files.length > 0 && (
            <div className="mt-4">
              <p className="font-medium">{files.length} {files.length === 1 ? 'file' : 'files'} selected</p>
              <ul className="mt-2 space-y-2">
                {Array.from(files).map((file, index) => (
                  <li key={index} className="flex items-center text-sm bg-secondary/10 dark:bg-gray-800 border border-border rounded-lg p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {uploadingFiles && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-sm text-center mt-2">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Link 
            href="/community" 
            className="px-6 py-2 border border-border rounded-lg mr-3 hover:bg-secondary/10 dark:hover:bg-gray-800/50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-primary hover:bg-accent text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || uploadingFiles}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="mr-2">Posting</span>
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              </span>
            ) : (
              'Create Post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 