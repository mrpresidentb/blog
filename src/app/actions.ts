'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export async function handleGeneratePost(data: { topic: string; keywords: string }): Promise<GenerateBlogPostOutput | null> {
  try {
    const input: GenerateBlogPostInput = {
      ...data,
      tone: 'humorous',
    };
    const result = await generateBlogPost(input);
    return result;
  } catch (error) {
    console.error('Error generating blog post:', error);
    // In a real app, you might want to throw a more specific error
    // to be handled by an error boundary or the calling client component.
    return null;
  }
}

export async function handleFeedback(blogPost: string, rating: 'up' | 'down'): Promise<{success: boolean}> {
  try {
    await improveBlogPost({ blogPost, rating });
    return { success: true };
  } catch (error) {
    console.error('Error sending feedback:', error);
    return { success: false };
  }
}
