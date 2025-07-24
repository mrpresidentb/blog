
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

/**
 * Fetches a web page and extracts its main article content.
 * 
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object containing the scraped content or an error message.
 */
export async function scrapePageContent(url: string): Promise<ScrapedContent> {
  console.log(`[Page Scraper] Starting to scrape: ${url}`);
  try {
    // Fetch the HTML content of the page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000, // 10 second timeout
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
      .replace(/(\s*\n\s*){3,}/g, '\n\n') // Replace 3+ newlines (with surrounding whitespace) with a double newline
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
