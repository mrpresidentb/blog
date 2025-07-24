
'use server';

/**
 * @fileOverview A service for scraping and extracting main content from web pages.
 */

import axios from 'axios';
import { z } from 'zod';

const ScrapedPageSchema = z.object({
    url: z.string().url(),
    success: z.boolean(),
    htmlContent: z.string().optional(),
    error: z.string().optional(),
    userAgent: z.string().optional(),
    rawRequestUrl: z.string().url().optional(),
    rawResponse: z.string().optional(),
});

export type ScrapedPage = z.infer<typeof ScrapedPageSchema>;

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
 * A robust function to scrape a single page using either standard fetch or ScraperAPI.
 * @param url The URL of the page to scrape.
 * @param type The scraper type to use.
 * @returns A promise resolving to a ScrapedPage object.
 */
export async function scrapePage(url: string, type: 'standard' | 'scraper_api' = 'standard'): Promise<ScrapedPage> {
    if (type === 'scraper_api') {
        const apiKey = process.env.SCRAPERAPI_KEY;
        if (apiKey) {
            return scrapeWithScraperAPI(url, apiKey);
        }
        console.warn('ScraperAPI key not found, falling back to standard scraper.');
    }
    return scrapeWithStandard(url);
}

/**
 * Fetches a web page using standard axios and returns raw HTML.
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object containing the raw HTML or an error message.
 */
async function scrapeWithStandard(url: string): Promise<ScrapedPage> {
    const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
    try {
        console.log(`[Page Scraper - Standard] Starting to scrape: ${url} with User-Agent: ${randomUserAgent}`);
        const response = await axios.get(url, {
            headers: { 'User-Agent': randomUserAgent },
            timeout: 15000,
        });

        if (response.status !== 200) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        
        console.log(`[Page Scraper - Standard] Successfully scraped: ${url}.`);
        return {
            url,
            success: true,
            htmlContent: response.data,
            userAgent: randomUserAgent,
            rawRequestUrl: url,
            rawResponse: response.data,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Scraper - Standard] Critical failure at ${url}:`, errorMessage);
        return {
            url,
            success: false,
            error: errorMessage,
            userAgent: randomUserAgent,
            rawRequestUrl: url,
            rawResponse: errorMessage,
        };
    }
}

/**
 * Fetches a web page using ScraperAPI and returns raw HTML.
 * @param targetUrl The URL of the page to scrape.
 * @param apiKey The ScraperAPI key.
 * @returns A promise that resolves to an object containing the raw HTML or an error message.
 */
async function scrapeWithScraperAPI(targetUrl: string, apiKey: string): Promise<ScrapedPage> {
    // Базовый URL с обязательными параметрами
    let scraperApiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
    
    // ДОБАВЛЕНО: Дополнительные параметры из вашего примера
    const additionalParams = '&render=true&follow_redirect=false&retry_404=true&device_type=desktop';
    scraperApiUrl += additionalParams;

    try {
        console.log(`[Page Scraper - ScraperAPI] Starting to scrape with options: ${targetUrl}`);
        
        const response = await axios.get(scraperApiUrl, {
            timeout: 90000, // Увеличим таймаут, т.к. рендеринг JS может быть долгим
        });

        if (response.status !== 200) {
            throw new Error(`Request failed with status ${response.status}. Response: ${response.data}`);
        }

        console.log(`[Page Scraper - ScraperAPI] Successfully scraped: ${targetUrl}.`);
        return {
            url: targetUrl,
            success: true,
            htmlContent: response.data,
            userAgent: 'ScraperAPI',
            rawRequestUrl: scraperApiUrl,
            rawResponse: response.data,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Scraper - ScraperAPI] Critical failure at ${targetUrl}:`, errorMessage);
        return {
            url: targetUrl,
            success: false,
            error: errorMessage,
            userAgent: 'ScraperAPI',
            rawRequestUrl: scraperApiUrl,
            rawResponse: errorMessage,
        };
    }
}