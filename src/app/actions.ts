'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateBlogImages, ImageDetails } from '@/ai/flows/generate-blog-images';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export type AppGeneratePostInput = GenerateBlogPostInput & {
  generateImages?: boolean;
};

export type AppGeneratePostOutput = GenerateBlogPostOutput & {
  images: ImageDetails[];
  rawOutput: string;
};

export async function handleGeneratePost(data: AppGeneratePostInput): Promise<AppGeneratePostOutput> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  let blogPostResult: GenerateBlogPostOutput | null = null;
  let imageDetails: ImageDetails[] = [];
  try {
    const input: GenerateBlogPostInput = {
      ...data,
    };
    
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    blogPostResult = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(blogPostResult, null, 2));
    
    if (data.generateImages && blogPostResult?.htmlContent) {
      console.log('HANDLE GENERATE POST: Generating images...');
      const imageResult = await generateBlogImages({ blogContent: blogPostResult.htmlContent });
      imageDetails = imageResult.images;
      console.log('HANDLE GENERATE POST: Image details received:', imageDetails);
    }
    
    const finalResult = { 
      htmlContent: blogPostResult?.htmlContent || '',
      images: imageDetails,
      rawOutput: JSON.stringify({ blogPostResult, imageDetails }, null, 2),
    };
    return finalResult;

  } catch (error) {
    console.error('HANDLE GENERATE POST: Error generating blog post:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    
    return {
      htmlContent: `<h1>Error Generating Post</h1><p>An error occurred: ${errorMessage}</p><p>Please check the server logs for more details.</p>`,
      images: [],
      rawOutput: rawError,
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
