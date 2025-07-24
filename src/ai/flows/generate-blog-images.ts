
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
// import { uploadImageToStorage } from '@/services/firebase';

// Schema for the prompt that generates image prompts
const ImagePromptGeneratorInputSchema = z.object({
  blogContent: z.string().describe('The full HTML content of the blog post.'),
});

const ImagePromptGeneratorOutputSchema = z.object({
  prompts: z.array(z.string()).length(2).describe('An array of exactly two descriptive prompts for an image generation model.'),
});

// Prompt to create image prompts from blog content
const imagePromptGenerator = ai.definePrompt({
  name: 'imagePromptGenerator',
  input: { schema: ImagePromptGeneratorInputSchema },
  output: { schema: ImagePromptGeneratorOutputSchema },
  prompt: `You are an expert at creating powerful, descriptive prompts for an AI image generator.
Read the following blog post content and generate two distinct, detailed, and visually compelling prompts that capture the essence of the article.
The prompts should describe a scene, concept, or metaphor related to the blog post.
Each prompt must be a single, concise paragraph. Avoid using lists or special characters.

Blog Content:
{{{blogContent}}}

Generate two unique prompts.`,
});

// Flow to generate image prompts
const generateImagePromptsFlow = ai.defineFlow(
  {
    name: 'generateImagePromptsFlow',
    inputSchema: ImagePromptGeneratorInputSchema,
    outputSchema: ImagePromptGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await imagePromptGenerator(input);
    if (!output?.prompts || output.prompts.length !== 2) {
      throw new Error('Failed to generate two valid image prompts.');
    }
    return output;
  }
);

// Flow to generate a single image from a prompt, returning a data URI
const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: z.string(),
    outputSchema: z.string(), // This will be the data URI
  },
  async (prompt) => {
    console.log(`[generateImageFlow] Starting generation for prompt: "${prompt}"`);
    try {
      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      console.log('[generateImageFlow] Received response from AI:', JSON.stringify(result, null, 2));

      const media = result.media;
      if (!media?.url) {
        console.error('[generateImageFlow] Image generation failed. No media URL in response.');
        throw new Error('Image generation failed: No media URL returned from the AI.');
      }

      console.log('[generateImageFlow] Image generation successful, data URI received.');
      return media.url;
    } catch (error) {
      console.error('[generateImageFlow] An error occurred during image generation:', error);
      // Re-throw the error to be caught by the calling flow
      throw new Error(`Failed to generate image for prompt "${prompt}". Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);


// Main flow that orchestrates generating prompts and then generating images
const GenerateBlogImagesInputSchema = z.object({
  blogContent: z.string(),
});

// Schema for image details
const ImageDetailsSchema = z.object({
  url: z.string(),
  altText: z.string(),
  title: z.string(),
  caption: z.string(),
  description: z.string(),
});
export type ImageDetails = z.infer<typeof ImageDetailsSchema>;

const GenerateBlogImagesOutputSchema = z.object({
  images: z.array(ImageDetailsSchema),
});


export const generateBlogImages = ai.defineFlow(
  {
    name: 'generateBlogImagesFlow',
    inputSchema: GenerateBlogImagesInputSchema,
    outputSchema: GenerateBlogImagesOutputSchema,
  },
  async ({ blogContent }) => {
    console.log('[generateBlogImagesFlow] Starting to generate blog images...');
    // Step 1: Generate prompts from the blog content
    const { prompts } = await generateImagePromptsFlow({ blogContent });
    console.log('[generateBlogImagesFlow] Generated image prompts:', prompts);

    // Step 2: Generate an image for each prompt (get data URIs)
    console.log('[generateBlogImagesFlow] Generating images from prompts...');
    const dataUriPromises = prompts.map(prompt => generateImageFlow(prompt));
    const dataUris = await Promise.all(dataUriPromises);
    console.log('[generateBlogImagesFlow] All images generated successfully as data URIs.');
    
    // For now, we are not uploading to storage or generating metadata to isolate the problem.
    // We will return dummy metadata with the data URI as the URL.
    const images: ImageDetails[] = dataUris.map((uri, index) => ({
      url: uri, // Use the data URI directly
      altText: `Generated image for prompt: ${prompts[index]}`,
      title: `Generated Image ${index + 1}`,
      caption: `This is caption for image ${index + 1}`,
      description: `This is a longer description for the generated image ${index + 1}, based on the prompt.`,
    }));
    
    console.log('[generateBlogImagesFlow] Process completed successfully. Returning data URIs.');
    return { images };
  }
);
