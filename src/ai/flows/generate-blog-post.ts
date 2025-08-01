
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

import { performSearch } from '@/services/google-search';
import { scrapePage, ScrapedPage } from '@/services/page-scraper';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';


/* ---------- Константы ---------- */
const NUM_URLS_TO_SCRAPE   = 5;
const SCRAPE_BATCH_SIZE    = 5;          // ScraperAPI лимит ≤ 5 req/сек
const MAX_HTML_CHARS       = 20_000;     // чтобы не переполнить prompt
const MIN_ARTICLE_CHARS    = 150;        // фильтр мусора

/* ---------- Типы входа / выхода ---------- */
const GenerateBlogPostInputSchema = z.object({
  topic:                z.string(),
  keywords:             z.string(),
  tone:                 z.enum(['professional', 'humorous', 'neutral']).default('neutral'),
  articleLength:        z.string().optional(),
  customLength:         z.number().optional(),
  additionalInstructions:z.string().optional(),
  highQuality:          z.boolean().optional(),
  model:                z.string().optional(),
  scraperType:          z.enum(['standard', 'scraper_api']).optional(),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const InternalPromptInputSchema = GenerateBlogPostInputSchema.extend({
  articleLengthText: z.string().optional(),
  research_context : z.string().optional(),
});

const PromptOutputSchema = z.object({
  htmlContent   : z.string(),
  seoTitle      : z.string(),
  seoDescription: z.string(),
});

const GenerateBlogPostOutputSchema = PromptOutputSchema.extend({
  debugInfo: z.record(z.any()).optional(),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

/* ---------- AI-промпты ---------- */
const standardBlogPostPrompt = ai.definePrompt({
  name:   'standardBlogPostPrompt',
  input:  { schema: InternalPromptInputSchema.omit({ research_context: true }) },
  output: { schema: PromptOutputSchema },
  prompt: `
You are an expert blog-post writer and SEO specialist.
Write an engaging, ORIGINAL article using standard HTML tags (<h1>, <h2>, <p>, <ul>, <li>, <strong>).

IMPORTANT: After the article, you MUST return the following two fields in the specified JSON format:
1) "seoTitle" – An SEO-optimized title for the blog post. It MUST NOT exceed 60 characters.
2) "seoDescription" – An SEO-optimized meta description for the blog post. It MUST NOT exceed 160 characters.

Topic: {{{topic}}}
Keywords: {{{keywords}}}
Tone: {{{tone}}}
{{#if articleLengthText}}Length: {{{articleLengthText}}}{{/if}}
{{#if additionalInstructions}}Notes: {{{additionalInstructions}}}{{/if}}`.trim(),
});

const highQualityBlogPostPrompt = ai.definePrompt({
  name:   'highQualityBlogPostPrompt',
  input:  { schema: InternalPromptInputSchema },
  output: { schema: PromptOutputSchema },
  prompt: `
You are an expert writer and researcher. Synthesise a completely NEW and ORIGINAL article based *only* on the provided research context.
IMPORTANT: Do **NOT** copy text from the research context. Use it as a foundation to write an entirely new piece in your own words.
Use standard HTML tags (<h1>, <h2>, <p>, <ul>, <li>, <strong>).

After the article, you MUST return the following two fields in the specified JSON format:
1) "seoTitle" – An SEO-optimized title for the blog post. It MUST NOT exceed 60 characters.
2) "seoDescription" – An SEO-optimized meta description for the blog post. It MUST NOT exceed 160 characters.

--- RESEARCH CONTEXT START ---
{{{research_context}}}
--- RESEARCH CONTEXT END ---

Your task is to write a new article based on the provided context, focusing on this topic and keywords:
Topic: {{{topic}}}
Keywords: {{{keywords}}}
Tone: {{{tone}}}
{{#if articleLengthText}}Length: {{{articleLengthText}}}{{/if}}`.trim(),
});

/* ---------- 1. Генерация поисковых запросов ---------- */
const generateSearchQueriesFlow = ai.defineFlow(
  {
    name        : 'generateSearchQueriesFlow',
    inputSchema : z.object({ topic: z.string() }),
    outputSchema: z.object({ queries: z.array(z.string()) }),
  },
  async ({ topic }) => {
    const currentYear = new Date().getFullYear();
    const prompt = `
Generate 3-4 distinct Google queries to research "${topic}" for the current year, ${currentYear}.
Return **ONLY** JSON in the format: {"queries":["query one","query two"]}`.trim();

    try {
      const { output } = await ai.generate({
        prompt,
        model : 'googleai/gemini-2.5-flash',
        output: { format: 'json', schema: z.object({ queries: z.array(z.string()) }) }
      });
      if (output?.queries?.length) return output;
    } catch (err) { console.error('Query-gen error:', err); }
    return { queries: [topic] }; // fallback
  },
);


const checkRelevanceFlow = ai.defineFlow({
    name: 'checkRelevanceFlow',
    inputSchema: z.object({
        topic: z.string(),
        content: z.string(),
    }),
    outputSchema: z.boolean(),
}, async ({ topic, content }) => {
    const prompt = `You are a relevance checking agent. Is the following text relevant for writing an article about "${topic}"?
Respond with only "true" or "false".

Text:
---
${content.substring(0, 4000)}
---
`;
    try {
        const { output } = await ai.generate({
            prompt,
            model: 'googleai/gemini-2.5-flash-lite',
            output: {
                format: 'json',
                schema: z.boolean(),
            },
        });
        return output ?? false;
    } catch (err) {
        console.error(`[checkRelevanceFlow] Error:`, err);
        return false;
    }
});


/* ---------- Основной Flow ---------- */
const generateBlogPostFlow = ai.defineFlow(
  {
    name        : 'generateBlogPostFlow',
    inputSchema : GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input) => {
    const debugInfo: Record<string, any> = {};

    /* ---------- Нормализация длины ---------- */
    const lengthMap: Record<string, string> = {
      shorter: '≈ 400-500 words',
      short  : '≈ 500-600 words',
      medium : '≈ 600-700 words',
      long   : '≈ 700-1000 words',
      longer : '≈ 1200-2000 words',
      default: 'default length',
    };
    const articleLengthText =
      input.articleLength === 'custom' && input.customLength
        ? `${input.customLength} sections`
        : (input.articleLength && lengthMap[input.articleLength]) || undefined;
    
    const promptInputBase = {
        ...input,
        articleLengthText
    };

    /* ---------- HIGH-QUALITY (RAG) ---------- */
    if (input.highQuality) {
      debugInfo.mode = 'High Quality (RAG)';
      debugInfo.scraper = { type: input.scraperType };
      
      const { queries } = await generateSearchQueriesFlow({ topic: input.topic });
      debugInfo.generatedSearchQueries = queries;

      /* ---- 2.1 Search ---- */
      const allUrls = new Set<string>();
      const searchPromises = queries.map(q => performSearch(q));
      const searchResults = await Promise.all(searchPromises);
      debugInfo.rawSearchResults = searchResults;

      searchResults.flat().forEach(r => allUrls.add(r.link));
      const urlsToScrape = Array.from(allUrls).slice(0, NUM_URLS_TO_SCRAPE);
      debugInfo.urlsToScrape = urlsToScrape;
      
      /* ---- 2.2 Scrape + Clean + Filter ---- */
      const relevantContent: string[] = [];
      const scrapedPageDetails: Record<string, any> = {};

      for (let i = 0; i < urlsToScrape.length; i += SCRAPE_BATCH_SIZE) {
        const batchUrls = urlsToScrape.slice(i, i + SCRAPE_BATCH_SIZE);
        const settledScrapeResults = await Promise.allSettled(
          batchUrls.map(u => scrapePage(u, input.scraperType)),
        );

        for (const scrapeResult of settledScrapeResults) {
            if (scrapeResult.status !== 'fulfilled' || !scrapeResult.value?.success || !scrapeResult.value.htmlContent) {
                 if (scrapeResult.status === 'fulfilled' && scrapeResult.value) {
                    scrapedPageDetails[scrapeResult.value.url] = { isRelevant: false, error: 'Scrape failed or returned no content', ...scrapeResult.value };
                }
                continue;
            }

            const scrapedPage: ScrapedPage = scrapeResult.value;
            const { url, htmlContent, rawRequestUrl, rawResponse } = scrapedPage;
            
            try {
                // CLEAN with Readability
                const dom = new JSDOM(htmlContent, { url });
                const reader = new Readability(dom.window.document);
                const article = reader.parse();
                const cleanTextContent = article?.textContent || '';

                if (cleanTextContent.length < MIN_ARTICLE_CHARS) {
                    scrapedPageDetails[url] = { isRelevant: false, error: 'Not enough content after Readability parsing', ...scrapedPage };
                    continue;
                }
                
                // RELEVANCE CHECK on clean content
                const isRelevant = await checkRelevanceFlow({
                    topic: input.topic,
                    content: cleanTextContent,
                });
                
                scrapedPageDetails[url] = { isRelevant, rawRequest: rawRequestUrl, rawResponse: rawResponse?.substring(0, 1000) };

                if (isRelevant) {
                    relevantContent.push(`Source URL: ${url}\n\n'''\n${cleanTextContent}\n'''`);
                }

            } catch(e) {
                 scrapedPageDetails[url] = { isRelevant: false, error: `Readability or relevance check failed: ${(e as Error).message}`, ...scrapedPage };
            }
        }
      }
      debugInfo.scrapedPageContentsAndRelevance = scrapedPageDetails;

      const research_context = relevantContent.join('\n\n---\n\n');
      debugInfo.researchContextSentToAI = research_context;
      
      if (research_context.length < MIN_ARTICLE_CHARS) {
        return {
          htmlContent: '<h1>Research Failed</h1><p>Could not find enough relevant information online to write a high-quality article on this topic. Please try a different topic or check the scraper settings.</p>',
          seoTitle: 'Research Failed',
          seoDescription: 'Could not find enough relevant information for the topic.',
          debugInfo,
        };
      }

      /* ---- 2.3 Финальный пост ---- */
      const { output } = await highQualityBlogPostPrompt(
        { ...promptInputBase, research_context },
        { model: input.model },
      );
      return { ...output, debugInfo };
    }

    /* ---------- STANDARD ---------- */
    debugInfo.mode = 'Standard';
    const { output } = await standardBlogPostPrompt(
      promptInputBase,
      { model: input.model },
    );
    return { ...output, debugInfo };
  },
);

/* ---------- Внешний экспорт ---------- */
export async function generateBlogPost(
  input: GenerateBlogPostInput,
): Promise<GenerateBlogPostOutput> {
  try {
    return await generateBlogPostFlow(input);
  } catch(e) {
      const error = e as Error;
      console.error("CRITICAL ERROR in generateBlogPostFlow:", e);
      return {
          htmlContent: `<h1>Error Generating Post</h1><p>A critical error occurred: ${error.message}</p><p>Check the Output tab for more details.</p>`,
          seoTitle: 'Error',
          seoDescription: 'An error occurred during generation.',
          debugInfo: {
            criticalError: {
              message: error.message,
              stack: error.stack,
            }
          }
      };
  }
}
