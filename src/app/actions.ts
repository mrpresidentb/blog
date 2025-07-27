
'use server';

import { generateBlogPost, GenerateBlogPostInput, GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateBlogImages, ImageDetails } from '@/ai/flows/generate-blog-images';
import { improveBlogPost } from '@/ai/flows/improve-blog-post';
import { regenerateSeoTitle, RegenerateSeoTitleInput, RegenerateSeoTitleOutput, regenerateSeoDescription, RegenerateSeoDescriptionInput, RegenerateSeoDescriptionOutput } from '@/ai/flows/regenerate-seo-metadata';
import { generateSeoOnly } from '@/ai/flows/generate-seo-only';


export type AppGeneratePostInput = GenerateBlogPostInput & { seoOnly?: boolean };

export type AppGeneratePostOutput = {
  htmlContent: string;
  seoTitle: string;
  seoDescription: string;
  rawOutput: string;
};

export async function handleGeneratePost(data: AppGeneratePostInput): Promise<AppGeneratePostOutput> {
  console.log('HANDLE GENERATE POST: Received data:', JSON.stringify(data, null, 2));
  
  // SEO Only Mode
  if (data.seoOnly) {
    console.log('HANDLE GENERATE POST: SEO Only mode activated.');
    const seoResult = await generateSeoOnly({
        topic: data.topic,
        keywords: data.keywords,
        model: data.model,
    });
    const rawOutput = JSON.stringify(seoResult.debugInfo || {}, null, 2);
    return {
        htmlContent: `<h1>SEO Content Generated</h1><p>The "SEO Only" mode was enabled. You can find the generated title and description in the "SEO" tab.</p>`,
        seoTitle: seoResult.seoTitle,
        seoDescription: seoResult.seoDescription,
        rawOutput: rawOutput,
    }
  }
  
  // Full Post Generation Mode
  try {
    const input: GenerateBlogPostInput = { ...data };
    
    console.log('HANDLE GENERATE POST: Calling generateBlogPost with input:', JSON.stringify(input, null, 2));
    const blogPostResult = await generateBlogPost(input);
    console.log('HANDLE GENERATE POST: Result from generateBlogPost:', JSON.stringify(blogPostResult, null, 2));
    
    const rawOutput = JSON.stringify(blogPostResult.debugInfo || {}, null, 2);

    return { 
      htmlContent: blogPostResult.htmlContent,
      seoTitle: blogPostResult.seoTitle,
      seoDescription: blogPostResult.seoDescription,
      rawOutput: rawOutput,
    };

  } catch (error) {
    console.error('HANDLE GENERATE POST: UNHANDLED Error in action:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawError = JSON.stringify({
        unhandledActionError: errorMessage,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    }, null, 2);
    
    return {
      htmlContent: `<h1>Unhandled Server Error</h1><p>An unexpected error occurred in the action handler: ${errorMessage}</p><p>This indicates a problem outside the main generation flow. Please check the server logs.</p>`,
      seoTitle: 'Error',
      seoDescription: 'An error occurred.',
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

export async function handleRegenerateSeoTitle(input: RegenerateSeoTitleInput): Promise<RegenerateSeoTitleOutput> {
    return regenerateSeoTitle(input);
}

export async function handleRegenerateSeoDescription(input: RegenerateSeoDescriptionInput): Promise<RegenerateSeoDescriptionOutput> {
    return regenerateSeoDescription(input);
}
