
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
      throw new Error(`Failed to generate image for prompt "${prompt}". Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// --- METADATA GENERATION ---

// Schema for image metadata
const ImageDetailsSchema = z.object({
  url: z.string(),
  altText: z.string().describe("Descriptive alt text for the image, focusing on accessibility."),
  title: z.string().describe("A short, catchy title for the image."),
  caption: z.string().describe("A brief, one-sentence caption for the image."),
  description: z.string().describe("A longer, more detailed description of the image and its relevance to the blog post."),
});
export type ImageDetails = z.infer<typeof ImageDetailsSchema>;

// Schema for metadata generator input
const ImageMetadataGeneratorInputSchema = z.object({
    prompt: z.string(),
    blogContent: z.string(),
});

// Prompt for generating metadata for a single image
const imageMetadataGenerator = ai.definePrompt({
    name: 'imageMetadataGenerator',
    input: { schema: ImageMetadataGeneratorInputSchema },
    output: { schema: ImageDetailsSchema.omit({ url: true }) },
    prompt: `You are an expert in SEO and image optimization for blogs.
Based on the image prompt and the blog post content below, generate the following metadata for the image:
1.  **Alt Text**: A descriptive alt text for accessibility. It should describe the image literally.
2.  **Title**: A short, catchy title.
3.  **Caption**: A brief, one-sentence caption.
4.  **Description**: A longer description of the image and its connection to the blog post.

Image Prompt: "{{{prompt}}}"

Blog Content:
---
{{{blogContent}}}
---
`,
});

// Flow to generate metadata for one image
const generateImageMetadataFlow = ai.defineFlow(
    {
        name: 'generateImageMetadataFlow',
        inputSchema: ImageMetadataGeneratorInputSchema,
        outputSchema: ImageDetailsSchema.omit({ url: true }),
    },
    async (input) => {
        const { output } = await imageMetadataGenerator(input);
        if (!output) {
            throw new Error(`Failed to generate metadata for prompt: ${input.prompt}`);
        }
        return output;
    }
);

// Main flow that orchestrates generating prompts and then generating images
const GenerateBlogImagesInputSchema = z.object({
  blogContent: z.string(),
});

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
    
    // Step 3: Generate metadata for each image
    console.log('[generateBlogImagesFlow] Generating metadata for images...');
    const metadataPromises = prompts.map(prompt => generateImageMetadataFlow({ prompt, blogContent }));
    const metadatas = await Promise.all(metadataPromises);
    console.log('[generateBlogImagesFlow] All metadata generated successfully.');

    // Step 4: Combine URIs and metadata
    const images: ImageDetails[] = dataUris.map((uri, index) => ({
        url: uri,
        ...metadatas[index],
    }));
    
    console.log('[generateBlogImagesFlow] Process completed successfully. Returning images with metadata.');
    return { images };
  }
);
