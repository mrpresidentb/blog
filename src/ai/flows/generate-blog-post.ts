/* eslint-disable no-console */
/* ------------------------------------------------------------------
 *  generate-blog-post.ts
 * ------------------------------------------------------------------
 *  Полный AI-пайплайн: search → scrape → clean+relevance (Gemini) →
 *  агрегированный RAG-контекст → финальный пост.
 * ---------------------------------------------------------------- */

//'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

import { performSearch, SearchResult } from '@/services/google-search';
import { scrapePage, ScrapedPage } from '@/services/page-scraper';

/* ---------- Константы ---------- */
const NUM_URLS_TO_SCRAPE   = 10;
const SCRAPE_BATCH_SIZE    = 5;          // ScraperAPI лимит ≤ 5 req/сек
const MAX_HTML_CHARS       = 20_000;     // чтобы не переполнить prompt
const MIN_ARTICLE_CHARS    = 150;        // фильтр мусора

/* ---------- Типы входа / выхода ---------- */
export const GenerateBlogPostInputSchema = z.object({
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
  seoTitle      : z.string().max(60),
  seoDescription: z.string().max(160),
});

export const GenerateBlogPostOutputSchema = PromptOutputSchema.extend({
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

After the article return:
1) "seoTitle" – ≤ 60 chars
2) "seoDescription" – ≤ 160 chars

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
You are an expert writer. Synthesise a NEW article based on the research context (do **NOT** copy).
Return the same three fields as JSON.

--- RESEARCH CONTEXT START ---
{{{research_context}}}
--- RESEARCH CONTEXT END ---

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
Generate 3–4 distinct Google queries to research "${topic}" (${currentYear}).
Return **ONLY** JSON: {"queries":["q1","q2"]}`.trim();

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

/* ---------- 2. Очистка + релевантность (одна страница = один запрос) ---------- */
const cleanAndFilterFlow = ai.defineFlow(
  {
    name        : 'cleanAndFilterFlow',
    inputSchema : z.object({
      topic     : z.string(),
      rawContent: z.string(),
      url       : z.string().url(),
    }),
    outputSchema: z.object({
      isRelevant     : z.boolean(),
      cleanedContent : z.string().optional(),
    }),
  },
  async ({ topic, rawContent, url }) => {
    const trimmed = rawContent.slice(0, MAX_HTML_CHARS);
    const prompt  = `
You are a content-extraction agent.
Task: decide if the HTML contains an article RELEVANT to "${topic}".
If yes – return JSON {"isRelevant":true,"cleanedContent":"ONLY clear article text"}.
If no – return JSON {"isRelevant":false}.

HTML (truncated):
${trimmed}`.trim();

    try {
      const { output } = await ai.generate({
        prompt,
        model : 'googleai/gemini-2.5-flash',
        output: {
          format: 'json',
          schema: z.object({
            isRelevant    : z.boolean(),
            cleanedContent: z.string().optional(),
          }),
        },
      });
      /* safety check */
      if (output.isRelevant && (output.cleanedContent ?? '').length < MIN_ARTICLE_CHARS) {
        return { isRelevant: false };
      }
      return output;
    } catch (err) {
      console.error(`[cleanAndFilterFlow] ${url}:`, err);
      return { isRelevant: false };
    }
  },
);

/* ---------- Основной Flow ---------- */
export const generateBlogPostFlow = ai.defineFlow(
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

    /* ---------- HIGH-QUALITY (RAG) ---------- */
    if (input.highQuality) {
      debugInfo.mode = 'High Quality (RAG)';
      const { queries } = await generateSearchQueriesFlow({ topic: input.topic });
      debugInfo.queries = queries;

      /* ---- 2.1 Search ---- */
      const allUrls = new Set<string>();
      for (const q of queries) {
        const res = await performSearch(q);
        debugInfo[`search:${q}`] = res;
        res.forEach(r => allUrls.add(r.link));
      }
      const urls = Array.from(allUrls).slice(0, NUM_URLS_TO_SCRAPE);

      /* ---- 2.2 Scrape + Clean ---- */
      const relevantChunks: string[] = [];
      debugInfo.clean = {};

      for (let i = 0; i < urls.length; i += SCRAPE_BATCH_SIZE) {
        const batch = urls.slice(i, i + SCRAPE_BATCH_SIZE);
        const scraped = await Promise.allSettled(
          batch.map(u => scrapePage(u, input.scraperType)),
        );

        for (const res of scraped) {
          if (res.status !== 'fulfilled' || !res.value?.success) continue;
          const page: ScrapedPage = res.value;
          const clean = await cleanAndFilterFlow({
            topic: input.topic,
            rawContent: page.htmlContent || '',
            url: page.url,
          });

          debugInfo.clean[page.url] = clean.isRelevant;
          if (clean.isRelevant && clean.cleanedContent) {
            relevantChunks.push(`SOURCE: ${page.url}\n\n${clean.cleanedContent}`);
          }
        }
      }

      const research_context = relevantChunks.join('\n\n---\n\n');
      debugInfo.researchContextLen = research_context.length;

      /* ---- 2.3 Финальный пост ---- */
      const { output } = await highQualityBlogPostPrompt(
        { ...input, articleLengthText, research_context },
        { model: input.model },
      );
      return { ...output, debugInfo };
    }

    /* ---------- STANDARD ---------- */
    debugInfo.mode = 'Standard';
    const { output } = await standardBlogPostPrompt(
      { ...input, articleLengthText },
      { model: input.model },
    );
    return { ...output, debugInfo };
  },
);

/* ---------- Внешний экспорт ---------- */
export async function generateBlogPost(
  input: GenerateBlogPostInput,
): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}
