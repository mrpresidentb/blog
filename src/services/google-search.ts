
'use server';

/**
 * @fileOverview A service for interacting with the Google Custom Search API.
 * This file provides a function to perform searches and return structured results.
 */

import { z } from 'zod';

// Define the schema for a single search result item
const SearchResultItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string(),
});

// Define the schema for the overall search API response
const SearchResponseSchema = z.object({
  items: z.array(SearchResultItemSchema).optional(),
});

// Type for a single search result
export type SearchResult = z.infer<typeof SearchResultItemSchema>;

const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';

/**
 * Performs a search using the Google Custom Search API.
 * 
 * @param query The search query string.
 * @returns A promise that resolves to an array of search results.
 * @throws An error if the search fails for reasons other than missing credentials.
 */
export async function performSearch(query: string): Promise<SearchResult[]> {
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    console.warn('[Google Search] API key or Search Engine ID is not configured. Skipping search.');
    return [];
  }

  const url = new URL(GOOGLE_SEARCH_API_ENDPOINT);
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('cx', SEARCH_ENGINE_ID);
  url.searchParams.append('q', query);
  url.searchParams.append('num', '5'); // Fetch top 5 results

  console.log(`[Google Search] Performing search for: "${query}"`);

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Google Search] API request failed with status ${response.status}:`, errorBody);
      throw new Error(`Google Search API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const parsed = SearchResponseSchema.safeParse(data);

    if (!parsed.success) {
        console.error('[Google Search] Failed to parse search response:', parsed.error);
        return [];
    }
    
    console.log(`[Google Search] Found ${parsed.data.items?.length ?? 0} results for "${query}"`);
    return parsed.data.items || [];

  } catch (error) {
    console.error('[Google Search] An unexpected error occurred during search:', error);
    // Return an empty array to allow the blog generation to proceed without search results if needed.
    return [];
  }
}
