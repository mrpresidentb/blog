
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { performSearch } from '@/services/google-search';

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
    research_context: z.string().optional().describe('Context from real-time search results.'),
});


const GenerateBlogPostOutputSchema = z.object({
  htmlContent: z.string().describe('The complete blog post content with HTML tags.'),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

// Prompt for the standard generation flow
const standardBlogPostPrompt = ai.definePrompt({
  name: 'standardBlogPostPrompt',
  input: {
    schema: InternalPromptInputSchema.omit({ research_context: true }),
  },
  output: {
    schema: GenerateBlogPostOutputSchema,
  },
  prompt: `You are an expert blog post writer. Your primary goal is to create engaging, well-researched, and SEO-optimized blog posts.
The blog post MUST include standard HTML tags (e.g., <h1>, <h2>, <p>, <ul>, <li>, <strong>).
The output should be a complete blog post, with no placeholders or unfinished sentences.
You MUST use your extensive internal knowledge to write a creative and compelling post based on the provided topic, keywords, and tone.

Topic: {{{topic}}}
Keywords: {{{keywords}}}
Tone: {{{tone}}}
{{#if articleLengthText}}
Article Length: {{{articleLengthText}}}
{{/if}}

Please generate a complete blog post with HTML tags that is both informative and engaging.`,
});

// Prompt for the high-quality (RAG) generation flow
const highQualityBlogPostPrompt = ai.definePrompt({
  name: 'highQualityBlogPostPrompt',
  input: {
    schema: InternalPromptInputSchema,
  },
  output: {
    schema: GenerateBlogPostOutputSchema,
  },
  prompt: `You are an expert blog post writer. Your primary goal is to write an original, insightful, and SEO-optimized blog post based on the provided research context.

**DO NOT** simply copy the text from the research context. You must synthesize the information, add your own insights, and write a completely new article in your own words.

**Research Context:**
---
{{{research_context}}}
---

Based on the research context above and your extensive knowledge, write a complete blog post.

The blog post MUST include standard HTML tags (e.g., <h1>, <h2>, <p>, <ul>, <li>, <strong>).

Topic: {{{topic}}}
Keywords: {{{keywords}}}
Tone: {{{tone}}}
{{#if articleLengthText}}
Article Length: {{{articleLengthText}}}
{{/if}}

Please generate a complete, well-structured blog post.`,
});


// New flow to generate search queries for RAG
const generateSearchQueriesFlow = ai.defineFlow(
  {
    name: 'generateSearchQueriesFlow',
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: z.object({ queries: z.array(z.string()) }),
  },
  async ({ topic }) => {
    const prompt = `Generate 3 specific, high-quality Google search queries to research the topic: "${topic}".
    The queries should be diverse to cover different aspects of the topic.
    Return only a JSON object with a 'queries' array. For example: {"queries": ["query 1", "query 2", "query 3"]}`;
    
    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
    });
    
    try {
        return JSON.parse(output as string);
    } catch(e) {
        console.error("Failed to parse search queries:", e);
        // Fallback in case of parsing failure
        return { queries: [topic] };
    }
  }
);


const generateBlogPostFlow = ai.defineFlow({
  name: 'generateBlogPostFlow',
  inputSchema: GenerateBlogPostInputSchema,
  outputSchema: GenerateBlogPostOutputSchema,
}, async (input) => {
  console.log('GENERATE BLOG POST FLOW: Input received:', JSON.stringify(input, null, 2));
  
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

  const promptInputBase = {
    ...input,
    articleLengthText: articleLengthText || undefined,
  };

  // RAG flow for High Quality mode
  if (input.highQuality) {
    console.log("HIGH QUALITY MODE: Starting RAG process...");
    
    // 1. Generate search queries
    const { queries } = await generateSearchQueriesFlow({ topic: input.topic });
    console.log("HIGH QUALITY MODE: Generated search queries:", queries);

    // 2. Perform searches
    const searchPromises = queries.map(query => performSearch(query));
    const searchResults = await Promise.all(searchPromises);
    
    // 3. Aggregate search context
    const research_context = searchResults
      .flat() // Flatten the array of arrays
      .map((item, index) => `Source [${index+1}]: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
      .join('\n\n---\n\n');

    console.log("HIGH QUALITY MODE: Aggregated research context. Length:", research_context.length);

    const promptInput = { ...promptInputBase, research_context };
    console.log('HIGH QUALITY MODE: Calling prompt with processed input and context.');
    const {output} = await highQualityBlogPostPrompt(promptInput, { model: input.model });

    if (!output || !output.htmlContent) {
      throw new Error('AI returned empty or invalid output for high-quality post.');
    }
    return output;

  } else {
    // Standard flow
    console.log('STANDARD MODE: Calling prompt with processed input.');
    const {output} = await standardBlogPostPrompt(promptInputBase, { model: input.model });

    if (!output || !output.htmlContent) {
      throw new Error('AI returned empty or invalid output for standard post.');
    }
    return output;
  }
});
