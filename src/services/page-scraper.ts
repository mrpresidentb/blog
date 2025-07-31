/* ------------------------------------------------------------------
 *  page-scraper.ts
 * ------------------------------------------------------------------
 *  Скачивает полный HTML (до 1 МБ) — далее AI-поток сам чистит и
 *  проверяет релевантность.
 * ---------------------------------------------------------------- */

'use server';

import axios from 'axios';
import { z } from 'zod';

const MAX_BYTES = 1_000_000;                 // 1 MB достаточно для статьи

/* ---------- Тип результата ---------- */
const ScrapedPageSchema = z.object({
  url         : z.string().url(),
  success     : z.boolean(),
  htmlContent : z.string().optional(),       // обязателен, если success === true
  error       : z.string().optional(),
  userAgent   : z.string().optional(),
  rawRequestUrl: z.string().url().optional(),
});
export type ScrapedPage = z.infer<typeof ScrapedPageSchema>;

/* ---------- User-Agent-ы ---------- */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

/* ---------- Диспетчер ---------- */
export async function scrapePage(
  url: string,
  type: 'standard' | 'scraper_api' = 'standard',
): Promise<ScrapedPage> {
  if (type === 'scraper_api' && process.env.SCRAPERAPI_KEY) {
    return scrapeWithScraperAPI(url, process.env.SCRAPERAPI_KEY);
  }
  return scrapeWithStandard(url);
}

/* ---------- Стандартный скрапер ---------- */
async function scrapeWithStandard(url: string): Promise<ScrapedPage> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const { data, status } = await axios.get(url, {
      headers          : { 'User-Agent': ua, Accept: 'text/html' },
      timeout          : 15_000,
      maxContentLength : MAX_BYTES,
      responseType     : 'text',
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    return { url, success: true, htmlContent: data, userAgent: ua, rawRequestUrl: url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Scraper-Standard]', url, msg);
    return { url, success: false, error: msg, userAgent: ua, rawRequestUrl: url };
  }
}

/* ---------- ScraperAPI ---------- */
async function scrapeWithScraperAPI(target: string, key: string): Promise<ScrapedPage> {
  const reqUrl = `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(
    target,
  )}&render=true&device_type=desktop`;
  try {
    const { data, status } = await axios.get(reqUrl, {
      timeout          : 90_000,
      maxContentLength : MAX_BYTES,
      responseType     : 'text',
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    return { url: target, success: true, htmlContent: data, userAgent: 'ScraperAPI', rawRequestUrl: reqUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Scraper-API]', target, msg);
    return { url: target, success: false, error: msg, userAgent: 'ScraperAPI', rawRequestUrl: reqUrl };
  }
}
