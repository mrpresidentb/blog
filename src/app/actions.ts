
'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateBlogImages, ImageDetails } from '@/ai/flows/generate-blog-images';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export type AppGeneratePostInput = GenerateBlogPostInput;

export type AppGeneratePostOutput = GenerateBlogPostOutput & {
  rawOutput: string;
};

export async function handleGeneratePost(data: AppGeneratePostInput): Promise<AppGeneratePostOutput> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  try {
    const input: GenerateBlogPostInput = { ...data };
    
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    const blogPostResult = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(blogPostResult, null, 2));
    
    return { 
      htmlContent: blogPostResult.htmlContent,
      rawOutput: JSON.stringify({ blogPostResult }, null, 2),
    };

  } catch (error) {
    console.error('HANDLE GENERATE POST: Error generating blog post:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    
    return {
      htmlContent: `<h1>Error Generating Post</h1><p>An error occurred: ${errorMessage}</p><p>Please check the server logs for more details.</p>`,
      rawOutput: rawError,
    };
  }
}

export type AppGenerateImagesOutput = { 
  images: ImageDetails[] | null;
  error?: string;
  rawOutput?: string;
}

export async function handleGenerateImages(blogContent: string): Promise<AppGenerateImagesOutput> {
    console.log('HANDLE GENERATE IMAGES: Generating images...');
    try {
        const imageResult = await generateBlogImages({ blogContent });
        console.log('HANDLE GENERATE IMAGES: Image details received:', imageResult.images);
        return { 
            images: imageResult.images,
            rawOutput: JSON.stringify(imageResult, null, 2),
        };
    } catch (error) {
        console.error('HANDLE GENERATE IMAGES: Error generating images:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const rawError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        return { 
            images: [], 
            error: `An error occurred during image generation: ${errorMessage}`,
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
