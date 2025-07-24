
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
    userAgent: z.string().optional(),
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
 * Fetches a web page and extracts its main article content using standard axios.
 * 
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object containing the scraped content or an error message.
 */
export async function scrapePageContent(url: string): Promise<ScrapedContent> {
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  console.log(`[Page Scraper - Standard] Starting to scrape: ${url} with User-Agent: ${randomUserAgent}`);
  
  try {
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
    
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`[Page Scraper - Standard] Readability could not extract content from: ${url}`);
      return {
        url,
        success: false,
        error: 'Readability could not extract main content.',
        userAgent: randomUserAgent,
      };
    }

    const cleanedText = article.textContent
      .replace(/(\s*\n\s*){2,}/g, '\n\n')
      .trim(); 
    
    console.log(`[Page Scraper - Standard] Successfully extracted content from: ${url}. Length: ${cleanedText.length}`);
    return {
      url,
      success: true,
      textContent: cleanedText,
      userAgent: randomUserAgent,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Page Scraper - Standard] Failed to scrape ${url}:`, errorMessage);
    return {
      url,
      success: false,
      error: errorMessage,
      userAgent: randomUserAgent,
    };
  }
}


/**
 * Fetches a web page using ScraperAPI and extracts its main article content.
 * 
 * @param targetUrl The URL of the page to scrape.
 * @returns A promise that resolves to an object containing the scraped content or an error message.
 */
export async function scrapePageContentWithScraperAPI(targetUrl: string): Promise<ScrapedContent> {
    const apiKey = process.env.SCRAPERAPI_KEY;
    console.log(`[Page Scraper - ScraperAPI] Starting to scrape: ${targetUrl}`);

    if (!apiKey) {
        const errorMsg = 'ScraperAPI key is not configured.';
        console.error(`[Page Scraper - ScraperAPI] ${errorMsg}`);
        return {
            url: targetUrl,
            success: false,
            error: errorMsg,
            userAgent: 'ScraperAPI',
        };
    }

    const scraperApiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const response = await axios.get(scraperApiUrl, {
            timeout: 60000, // ScraperAPI can take longer, so increase timeout to 60s
        });

        if (response.status !== 200) {
            throw new Error(`Request failed with status ${response.status}. Response: ${response.data}`);
        }

        const html = response.data;

        const doc = new JSDOM(html, { url: targetUrl });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            console.warn(`[Page Scraper - ScraperAPI] Readability could not extract content from: ${targetUrl}`);
            return {
                url: targetUrl,
                success: false,
                error: 'Readability could not extract main content after ScraperAPI fetch.',
                userAgent: 'ScraperAPI',
            };
        }

        const cleanedText = article.textContent
            .replace(/(\s*\n\s*){2,}/g, '\n\n')
            .trim();

        console.log(`[Page Scraper - ScraperAPI] Successfully extracted content from: ${targetUrl}. Length: ${cleanedText.length}`);
        return {
            url: targetUrl,
            success: true,
            textContent: cleanedText,
            userAgent: 'ScraperAPI',
        };

    } catch (error) {
        let errorMessage = 'An unknown error occurred with ScraperAPI.';
        if (axios.isAxiosError(error)) {
            // Log more detailed info if it's an Axios error
            errorMessage = `ScraperAPI request failed: ${error.message}.`;
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage += ` Status: ${error.response.status}. Data: ${JSON.stringify(error.response.data)}.`;
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage += ' No response received from ScraperAPI.';
            }
        } else if (error instanceof Error) {
            errorMessage = `ScraperAPI error: ${error.message}`;
        }
        
        console.error(`[Page Scraper - ScraperAPI] Failed to scrape ${targetUrl}:`, errorMessage);
        return {
            url: targetUrl,
            success: false,
            error: errorMessage,
            userAgent: 'ScraperAPI',
        };
    }
}
