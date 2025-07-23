'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export async function handleGeneratePost(data: { topic: string; keywords: string }): Promise<GenerateBlogPostOutput | null> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  try {
    const input: GenerateBlogPostInput = {
      ...data,
      tone: 'humorous',
    };
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    const result = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('HANDLE GENERATE POST: Error generating blog post:', error);
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
