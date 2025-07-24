
'use server';

/**
 * @fileOverview A service for scraping and extracting main content from web pages.
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { z } from 'zod';

const ScrapedContentSchema = z.object({
    url: z.string().url(),
    success: z.boolean(),
    textContent: z.string().optional(),
    error: z.string().optional(),
});

export type ScrapedContent = z.infer<typeof ScrapedContentSchema>;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.0; RCT6213W23) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-S727VL) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/13.2 Chrome/83.0.4103.106 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; arm_64; Android 8.0.0; SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 YaBrowser/20.4.3.90.00 SA/1 TA/5.1 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; SM-J737U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36',
    'Dalvik/2.1.0 (Linux; U; Android 11; Mi A2 Build/RD1A.201105.003.C1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3955.0 Safari/537.36',
    'Mozilla/5.0 (Linux; arm; Android 7.0; BQ-5005L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.96 YaBrowser/20.4.0.237.00 SA/1 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; HD1901) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; SM-G930V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.86 Mobile Safari/537.36'
];


/**
 * Fetches a web page and extracts its main article content.
 * 
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object containing the scraped content or an error message.
 */
export async function scrapePageContent(url: string): Promise<ScrapedContent> {
  console.log(`[Page Scraper] Starting to scrape: ${url}`);
  try {
    const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    // Fetch the HTML content of the page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': randomUserAgent,
      },
      timeout: 15000, // 15 second timeout
    });

    if (response.status !== 200) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const html = response.data;
    
    // Parse the HTML using JSDOM
    const doc = new JSDOM(html, { url });
    
    // Use Mozilla's Readability to extract the main content
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`[Page Scraper] Readability could not extract content from: ${url}`);
      return {
        url,
        success: false,
        error: 'Readability could not extract main content.',
      };
    }

    // Clean up excessive newlines and whitespace, but preserve paragraph breaks.
    const cleanedText = article.textContent
      .replace(/(\s*\n\s*){2,}/g, '\n\n') // Replace 2+ newlines (with surrounding whitespace) with a double newline
      .trim(); // Trim leading/trailing whitespace
    
    console.log(`[Page Scraper] Successfully extracted and cleaned content from: ${url}. Length: ${cleanedText.length}`);
    return {
      url,
      success: true,
      textContent: cleanedText,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Page Scraper] Failed to scrape ${url}:`, errorMessage);
    return {
      url,
      success: false,
      error: errorMessage,
    };
  }
}
