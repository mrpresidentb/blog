
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- SEO Title Regeneration ---

const RegenerateSeoTitleInputSchema = z.object({
  blogContent: z.string().describe('The full HTML content of the blog post.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
});
export type RegenerateSeoTitleInput = z.infer<typeof RegenerateSeoTitleInputSchema>;

const RegenerateSeoTitleOutputSchema = z.object({
  seoTitle: z.string().describe('A new, concise, SEO-optimized title for the blog post.'),
});
export type RegenerateSeoTitleOutput = z.infer<typeof RegenerateSeoTitleOutputSchema>;


const regenerateSeoTitlePrompt = ai.definePrompt({
    name: 'regenerateSeoTitlePrompt',
    input: { schema: RegenerateSeoTitleInputSchema },
    output: { schema: RegenerateSeoTitleOutputSchema },
    prompt: `Based on the following blog post and keywords, generate a new, concise, SEO-optimized title.
IMPORTANT: The title MUST be 60 characters or less.

Keywords: {{{keywords}}}

Blog Content:
---
{{{blogContent}}}
---
`,
});

const regenerateSeoTitleFlow = ai.defineFlow({
    name: 'regenerateSeoTitleFlow',
    inputSchema: RegenerateSeoTitleInputSchema,
    outputSchema: RegenerateSeoTitleOutputSchema,
}, async (input) => {
    const { output } = await regenerateSeoTitlePrompt(input, { model: 'googleai/gemini-2.5-flash' });
    if (!output) {
        throw new Error('Failed to regenerate SEO title.');
    }
    return output;
});

export async function regenerateSeoTitle(input: RegenerateSeoTitleInput): Promise<RegenerateSeoTitleOutput> {
    return regenerateSeoTitleFlow(input);
}


// --- SEO Description Regeneration ---

const RegenerateSeoDescriptionInputSchema = z.object({
  blogContent: z.string().describe('The full HTML content of the blog post.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
});
export type RegenerateSeoDescriptionInput = z.infer<typeof RegenerateSeoDescriptionInputSchema>;


const RegenerateSeoDescriptionOutputSchema = z.object({
  seoDescription: z.string().describe('A new, compelling, SEO-optimized meta description for the blog post.'),
});
export type RegenerateSeoDescriptionOutput = z.infer<typeof RegenerateSeoDescriptionOutputSchema>;


const regenerateSeoDescriptionPrompt = ai.definePrompt({
    name: 'regenerateSeoDescriptionPrompt',
    input: { schema: RegenerateSeoDescriptionInputSchema },
    output: { schema: RegenerateSeoDescriptionOutputSchema },
    prompt: `Based on the following blog post and keywords, generate a new, compelling, SEO-optimized meta description.
IMPORTANT: The description MUST be 160 characters or less.

Keywords: {{{keywords}}}

Blog Content:
---
{{{blogContent}}}
---
`,
});

const regenerateSeoDescriptionFlow = ai.defineFlow({
    name: 'regenerateSeoDescriptionFlow',
    inputSchema: RegenerateSeoDescriptionInputSchema,
    outputSchema: RegenerateSeoDescriptionOutputSchema,
}, async (input) => {
    const { output } = await regenerateSeoDescriptionPrompt(input, { model: 'googleai/gemini-2.5-flash' });
    if (!output) {
        throw new Error('Failed to regenerate SEO description.');
    }
    return output;
});

export async function regenerateSeoDescription(input: RegenerateSeoDescriptionInput): Promise<RegenerateSeoDescriptionOutput> {
    return regenerateSeoDescriptionFlow(input);
}
