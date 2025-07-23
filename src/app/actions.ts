'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export async function handleGeneratePost(data: { topic: string; keywords: string }): Promise<GenerateBlogPostOutput> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  try {
    const input: GenerateBlogPostInput = {
      ...data,
      tone: 'humorous',
    };
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    const result = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(result, null, 2));
    // Ensure we always return a valid object, even if it's empty on failure (though the flow should throw).
    return result || { htmlContent: '' };
  } catch (error) {
    console.error('HANDLE GENERATE POST: Error generating blog post:', error);
    // In case of an error, return an object with an error message in the HTML content.
    // This prevents the client from receiving null and crashing.
    return {
      htmlContent: `<h1>Error Generating Post</h1><p>An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}</p><p>Please check the server logs for more details.</p>`
    };
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
