// The `wordpress-assistant` flow generates a complete, SEO-optimized blog post with HTML tags.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic of the blog post.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
  tone: z.enum(['professional', 'humorous', 'neutral']).default('neutral').describe('The tone of the blog post.'),
  articleLength: z.string().optional().describe('The desired length of the article, e.g., "short", "medium", "long", or a specific section count.'),
  customLength: z.number().optional().describe('A custom number of sections for the article, if articleLength is "custom".'),
  highQuality: z.boolean().optional().describe('If true, the model should perform a more thorough and in-depth generation process.'),
});

export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

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
    schema: GenerateBlogPostInputSchema,
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
{{#if articleLength}}
Article Length: {{#if customLength}}{{customLength}} sections{{else}}{{articleLength}}{{/if}}
{{/if}}
{{#if highQuality}}
Quality: High. Please take extra time to think, research, and structure the content for the best possible quality.
{{/if}}

Please generate a complete blog post with HTML tags that is both informative and engaging.
Make sure the generated post is SEO optimized based on your knowledge.
`,
});

const generateBlogPostFlow = ai.defineFlow({
  name: 'generateBlogPostFlow',
  inputSchema: GenerateBlogPostInputSchema,
  outputSchema: GenerateBlogPostOutputSchema,
}, async (input) => {
  console.log('GENERATE BLOG POST FLOW: Input received:', JSON.stringify(input, null, 2));
  const {output} = await generateBlogPostPrompt(input);
  console.log('GENERATE BLOG POST FLOW: Output from AI:', JSON.stringify(output, null, 2));
  if (!output || !output.htmlContent) {
    throw new Error('AI returned empty or invalid output.');
  }
  return output;
});
