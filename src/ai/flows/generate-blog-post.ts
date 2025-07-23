// The `wordpress-assistant` flow generates a complete, SEO-optimized blog post with HTML tags.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic of the blog post.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
  tone: z.enum(['professional', 'humorous', 'neutral']).default('neutral').describe('The tone of the blog post.'),
});

export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  htmlContent: z.string().describe('The complete blog post content with HTML tags.'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const addHtmlTags = ai.defineTool({
  name: 'addHtmlTags',
  description: 'Wraps text with appropriate HTML tags for a blog post.',
  inputSchema: z.object({
    text: z.string().describe('The text to be wrapped in HTML tags.'),
  }),
  outputSchema: z.string().describe('The HTML-formatted text.'),
}, async (input) => {
  // Basic HTML formatting (can be expanded)
  return `<div>${input.text}</div>`;
});

const generateBlogPostPrompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  tools: [addHtmlTags],
  input: {
    schema: GenerateBlogPostInputSchema,
  },
  output: {
    schema: GenerateBlogPostOutputSchema,
  },
  prompt: `You are an expert blog post writer.
  Your goal is to create engaging and SEO optimized blog posts.
  The blog post should include HTML tags using the available tool.

  Topic: {{{topic}}}
  Keywords: {{{keywords}}}
  Tone: {{{tone}}}

  Please generate a complete blog post with HTML tags that is both informative and engaging.
  Make sure the generated post is SEO optimized.
`,
});

const generateBlogPostFlow = ai.defineFlow({
  name: 'generateBlogPostFlow',
  inputSchema: GenerateBlogPostInputSchema,
  outputSchema: GenerateBlogPostOutputSchema,
}, async (input) => {
  const {output} = await generateBlogPostPrompt(input);
  return output!;
});
