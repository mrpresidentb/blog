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

// Flow to generate an image from a single prompt
const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    console.log(`Generating image for prompt: "${prompt}"`);
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      console.error('Image generation failed, no media URL returned.');
      throw new Error('Image generation failed.');
    }
    console.log('Image generation successful.');
    return media.url;
  }
);


// Main flow that orchestrates generating prompts and then generating images
const GenerateBlogImagesInputSchema = z.object({
  blogContent: z.string(),
});

const GenerateBlogImagesOutputSchema = z.object({
  imageUrls: z.array(z.string()),
});

export const generateBlogImages = ai.defineFlow(
  {
    name: 'generateBlogImagesFlow',
    inputSchema: GenerateBlogImagesInputSchema,
    outputSchema: GenerateBlogImagesOutputSchema,
  },
  async ({ blogContent }) => {
    console.log('Starting to generate blog images...');
    // Step 1: Generate prompts from the blog content
    const { prompts } = await generateImagePromptsFlow({ blogContent });
    console.log('Generated image prompts:', prompts);

    // Step 2: Generate an image for each prompt in parallel
    const imagePromises = prompts.map(prompt => generateImageFlow(prompt));
    const imageUrls = await Promise.all(imagePromises);

    console.log('All images generated successfully:', imageUrls);
    return { imageUrls };
  }
);
