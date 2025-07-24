
'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateBlogImages, ImageDetails } from '@/ai/flows/generate-blog-images';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';

export type AppGeneratePostInput = GenerateBlogPostInput;

export type AppGeneratePostOutput = {
  htmlContent: string;
  rawOutput: string;
};

export async function handleGeneratePost(data: AppGeneratePostInput): Promise<AppGeneratePostOutput> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  try {
    const input: GenerateBlogPostInput = { ...data };
    
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    const blogPostResult = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(blogPostResult, null, 2));
    
    // The rawOutput will now be just the debug information.
    const rawOutput = JSON.stringify(blogPostResult.debugInfo || {}, null, 2);

    return { 
      htmlContent: blogPostResult.htmlContent,
      rawOutput: rawOutput,
    };

  } catch (error) {
    // This top-level catch is now a final safety net. 
    // The flow itself should handle its errors and return debug info.
    console.error('HANDLE GENERATE POST: UNHANDLED Error in action:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawError = JSON.stringify({
        unhandledActionError: errorMessage,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    }, null, 2);
    
    return {
      htmlContent: `<h1>Unhandled Server Error</h1><p>An unexpected error occurred in the action handler: ${errorMessage}</p><p>This indicates a problem outside the main generation flow. Please check the server logs.</p>`,
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
