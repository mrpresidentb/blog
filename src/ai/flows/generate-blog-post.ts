
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic of the blog post.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
  tone: z.enum(['professional', 'humorous', 'neutral']).default('neutral').describe('The tone of the blog post.'),
  articleLength: z.string().optional().describe('The desired length of the article, e.g., "short", "medium", "long", or a specific word count range.'),
  customLength: z.number().optional().describe('A custom number of sections for the article, if articleLength is "custom".'),
  highQuality: z.boolean().optional().describe('If true, the model should perform a more thorough and in-depth generation process.'),
  model: z.string().optional().describe('The AI model to use for generation.'),
});

export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

// This is the schema the prompt will now receive, after TypeScript processing.
const InternalPromptInputSchema = GenerateBlogPostInputSchema.extend({
    articleLengthText: z.string().optional(),
});


const GenerateBlogPostOutputSchema = z.object({
  htmlContent: z.string().describe('The complete blog post content with HTML tags.'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const generateBlogPostPrompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  input: {
    schema: InternalPromptInputSchema,
  },
  output: {
    schema: GenerateBlogPostOutputSchema,
  },
  prompt: `You are an expert blog post writer. Your primary goal is to create engaging, well-researched, and SEO-optimized blog posts.
The blog post MUST include standard HTML tags (e.g., <h1>, <h2>, <p>, <ul>, <li>, <strong>).
The output should be a complete blog post, with no placeholders or unfinished sentences.
You MUST use your extensive internal knowledge to write a creative and compelling post based on the provided topic, keywords, and tone.
Under no circumstances should you return an empty or null response. If the topic is niche, be creative and generate the best possible content.

Topic: {{{topic}}}
Keywords: {{{keywords}}}
Tone: {{{tone}}}
{{#if articleLengthText}}
Article Length: {{{articleLengthText}}}
{{/if}}
{{#if highQuality}}
Quality: High. Please take extra time to think, research, and structure the content for the best possible quality.
{{/if}}

Please generate a complete blog post with HTML tags that is both informative and engaging.
Make sure the generated post is SEO optimized based on your knowledge and meets the requested word count.
`,
});

const generateBlogPostFlow = ai.defineFlow({
  name: 'generateBlogPostFlow',
  inputSchema: GenerateBlogPostInputSchema,
  outputSchema: GenerateBlogPostOutputSchema,
}, async (input) => {
  console.log('GENERATE BLOG POST FLOW: Input received:', JSON.stringify(input, null, 2));
  
  // === LOGIC MOVED TO TYPESCRIPT ===
  // This is where we build the descriptive string for the prompt.
  let articleLengthText = '';
  if (input.articleLength) {
    if (input.articleLength === 'custom' && input.customLength) {
      articleLengthText = `${input.customLength} sections`;
    } else if (input.articleLength === 'shorter') {
      articleLengthText = 'Approx. 400-500 words.';
    } else if (input.articleLength === 'short') {
      articleLengthText = 'Approx. 500-600 words.';
    } else if (input.articleLength === 'medium') {
      articleLengthText = 'Approx. 600-700 words.';
    } else if (input.articleLength === 'long') {
      articleLengthText = 'Approx. 700-1000 words.';
    } else if (input.articleLength === 'longer') {
        articleLengthText = 'Approx. 1200-2000 words.';
    } else if (input.articleLength === 'default') {
        articleLengthText = 'Default length.';
    }
  }

  const promptInput = {
    ...input,
    articleLengthText: articleLengthText || undefined, // Pass the generated string to the prompt
  };
  
  console.log('GENERATE BLOG POST FLOW: Calling prompt with processed input:', JSON.stringify(promptInput, null, 2));

  const {output} = await generateBlogPostPrompt(promptInput, { model: input.model });
  
  console.log('GENERATE BLOG POST FLOW: Output from AI:', JSON.stringify(output, null, 2));
  
  if (!output || !output.htmlContent) {
    throw new Error('AI returned empty or invalid output. This may happen with long-form content requests that time out or fail to generate. Please try a shorter length or different topic.');
  }
  return output;
});
