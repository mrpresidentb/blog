// The `wordpress-assistant` flow generates a complete, SEO-optimized blog post with HTML tags.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
    // Fallback in case of empty response from the model
    console.error('GENERATE BLOG POST FLOW: AI returned empty or invalid output. Using fallback.');
    return { htmlContent: '<h1>Apologies</h1><p>I was unable to generate a blog post for the given topic. Please try a different topic or adjust your keywords.</p>' };
  }
  return output;
});
