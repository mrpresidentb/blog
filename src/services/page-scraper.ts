'use server';

import axios from 'axios';
import { z } from 'zod';

// Устанавливаем более реалистичный лимит в 10 МБ. -1 для "без лимита".
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ScrapedPageSchema = z.object({
  url: z.string().url(),
  success: z.boolean(),
  htmlContent: z.string().optional(),
  error: z.string().optional(),
  userAgent: z.string().optional(),
  rawRequestUrl: z.string().url().optional(),
  rawResponse: z.string().optional(), // Добавляем rawResponse для отладки ошибок
});

export type ScrapedPage = z.infer<typeof ScrapedPageSchema>;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

export async function scrapePage(
  url: string,
  type: 'standard' | 'scraper_api' = 'standard',
): Promise<ScrapedPage> {
  if (type === 'scraper_api' && process.env.SCRAPERAPI_KEY) {
    return scrapeWithScraperAPI(url, process.env.SCRAPERAPI_KEY);
  }
  return scrapeWithStandard(url);
}

async function scrapeWithStandard(url: string): Promise<ScrapedPage> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const { data, status } = await axios.get(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html' },
      timeout: 15_000,
      maxBodyLength: MAX_BYTES, // ИЗМЕНЕНО: Используем правильное свойство для axios
      maxContentLength: MAX_BYTES, // ИЗМЕНЕНО: Используем правильное свойство для axios
      responseType: 'text',
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    return { url, success: true, htmlContent: data, userAgent: ua, rawRequestUrl: url, rawResponse: data };
  } catch (e) {
    const error = e as any;
    const msg = error.message || String(error);
    console.error('[Scraper-Standard]', url, msg);
    return { url, success: false, error: msg, userAgent: ua, rawRequestUrl: url, rawResponse: error.response?.data || msg };
  }
}

async function scrapeWithScraperAPI(target: string, key: string): Promise<ScrapedPage> {
  const reqUrl = `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(
    target,
  )}&render=true&device_type=desktop`;
  try {
    const { data, status } = await axios.get(reqUrl, {
      timeout: 90_000,
      maxBodyLength: MAX_BYTES, // ИЗМЕНЕНО: Используем правильное свойство для axios
      maxContentLength: MAX_BYTES, // ИЗМЕНЕНО: Используем правильное свойство для axios
      responseType: 'text',
    });
    if (status !== 200) throw new Error(`Status ${status}`);
    return { url: target, success: true, htmlContent: data, userAgent: 'ScraperAPI', rawRequestUrl: reqUrl, rawResponse: data };
  } catch (e) {
    const error = e as any;
    const msg = error.message || String(error);
    console.error('[Scraper-API]', target, msg);
    return { url: target, success: false, error: msg, userAgent: 'ScraperAPI', rawRequestUrl: reqUrl, rawResponse: error.response?.data || msg };
  }
}
