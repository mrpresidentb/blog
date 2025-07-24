
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { performSearch, SearchResult } from '@/services/google-search';
import { scrapePageContent } from '@/services/page-scraper';

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
  debugInfo: z.record(z.any()).optional().describe("Debugging information about the generation process."),
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
    schema: GenerateBlogPostOutputSchema.omit({ debugInfo: true }),
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
    schema: GenerateBlogPostOutputSchema.omit({ debugInfo: true }),
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


// Flow to generate search queries for RAG
const generateSearchQueriesFlow = ai.defineFlow(
  {
    name: 'generateSearchQueriesFlow',
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: z.object({ queries: z.array(z.string()) }),
  },
  async ({ topic }) => {
    const currentYear = new Date().getFullYear();
    const prompt = `Generate 3-4 diverse, high-quality Google search queries to research the topic: "${topic}".
The queries should cover different angles of the topic to gather comprehensive and current information.
For example, if the topic is "The Benefits of Meditation for Programmers", good queries would be:
- "benefits of meditation for software developers ${currentYear}"
- "mindfulness techniques for reducing burnout in tech"
- "impact of meditation on cognitive performance and focus"
- "how to start a meditation practice for busy professionals"

Return only a JSON object with a 'queries' array. Example: {"queries": ["query 1", "query 2", "query 3"]}`;
    
    try {
        const { output } = await ai.generate({
          prompt,
          model: 'googleai/gemini-2.5-flash',
          output: {
            format: 'json',
            schema: z.object({ queries: z.array(z.string()) }),
          }
        });
        
        if (output?.queries && Array.isArray(output.queries) && output.queries.length > 0) {
            console.log("Successfully generated and parsed search queries:", output.queries);
            return output;
        }

        console.warn("Failed to generate or parse search queries as JSON, falling back to topic.");
        // Fallback in case of parsing failure or empty array
        return { queries: [topic] };

    } catch(error) {
        console.error("Error generating search queries:", error);
        return { queries: [topic] };
    }
  }
);

// New flow to check for content relevance
const checkRelevanceFlow = ai.defineFlow({
    name: 'checkRelevanceFlow',
    inputSchema: z.object({
        topic: z.string(),
        content: z.string(),
    }),
    outputSchema: z.boolean(),
}, async ({ topic, content }) => {
    const prompt = `Is the following text relevant for writing an article about '${topic}'? The text may contain menus, ads, or other unrelated information, focus on the main content. Answer only with 'YES' or 'NO'.

Text:
---
${content.substring(0, 4000)}
---`; // Use a substring to keep the check fast and cheap

    try {
        const { output } = await ai.generate({
            prompt,
            model: 'googleai/gemini-2.5-flash',
        });
        
        const answer = output?.toUpperCase().trim() || 'NO';
        console.log(`[Relevance Check] For topic "${topic}", AI answered: "${answer}"`);
        return answer === 'YES';

    } catch (error) {
        console.error('[Relevance Check] Error during relevance check:', error);
        return false; // Default to not relevant on error
    }
});


const generateBlogPostFlow = ai.defineFlow({
  name: 'generateBlogPostFlow',
  inputSchema: GenerateBlogPostInputSchema,
  outputSchema: GenerateBlogPostOutputSchema,
}, async (input) => {
  console.log('GENERATE BLOG POST FLOW: Input received:', JSON.stringify(input, null, 2));
  
  const debugInfo: Record<string, any> = {};

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
    debugInfo.mode = "High Quality (RAG)";
    
    // 1. Generate search queries
    const { queries } = await generateSearchQueriesFlow({ topic: input.topic });
    console.log("HIGH QUALITY MODE: Generated search queries:", queries);
    debugInfo.generatedSearchQueries = queries;

    // 2. Perform searches and associate results with queries
    const searchResultsByQuery: Record<string, SearchResult[]> = {};
    const allUrls = new Set<string>();

    for (const query of queries) {
      const results = await performSearch(query);
      searchResultsByQuery[query] = results;
      results.forEach(r => allUrls.add(r.link));
    }
    debugInfo.rawSearchResults = searchResultsByQuery;

    const urlsToScrape = Array.from(allUrls).slice(0, 10); // Limit to 10 unique urls
    console.log(`HIGH QUALITY MODE: Found ${urlsToScrape.length} unique URLs to scrape.`);


    // 3. Scrape page content for each URL
    const scrapePromises = urlsToScrape.map(url => scrapePageContent(url));
    const scrapedContents = await Promise.all(scrapePromises);
    debugInfo.scrapedPageContents = scrapedContents; // Log full scraped content for debugging

    // 4. Relevance Check and Content Aggregation
    const relevantContent: string[] = [];
    const relevanceCheckResults: Record<string, any> = {};

    for (const content of scrapedContents) {
        if (content.success && content.textContent) {
            const isRelevant = await checkRelevanceFlow({
                topic: input.topic,
                content: content.textContent,
            });
            relevanceCheckResults[content.url] = {
                isRelevant,
                preview: content.textContent.substring(0, 200) + '...'
            };
            if (isRelevant) {
                relevantContent.push(`Source URL: ${content.url}\n\n'''\n${content.textContent}\n'''`);
            }
        } else {
             relevanceCheckResults[content.url] = {
                isRelevant: false,
                error: content.error
            };
        }
    }
    debugInfo.relevanceCheckResults = relevanceCheckResults;

    const research_context = relevantContent.join('\n\n---\n\n');

    console.log("HIGH QUALITY MODE: Aggregated research context. Length:", research_context.length);
    
    // CORRECT PLACEMENT FOR LOGGING
    debugInfo.researchContextSentToAI = research_context; 

    const promptInput = { ...promptInputBase, research_context };
    console.log('HIGH QUALITY MODE: Calling prompt with processed input and context.');
    const {output} = await highQualityBlogPostPrompt(promptInput, { model: input.model });

    if (!output || !output.htmlContent) {
      throw new Error('AI returned empty or invalid output for high-quality post.');
    }
    return { ...output, debugInfo };

  } else {
    // Standard flow
    console.log('STANDARD MODE: Calling prompt with processed input.');
    debugInfo.mode = "Standard";
    const {output} = await standardBlogPostPrompt(promptInputBase, { model: input.model });

    if (!output || !output.htmlContent) {
      throw new Error('AI returned empty or invalid output for standard post.');
    }
    return { ...output, debugInfo };
  }
});
