
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSeoOnlyInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate SEO metadata.'),
  keywords: z.string().describe('Comma-separated keywords for SEO optimization.'),
  model: z.string().optional().describe('The AI model to use for generation.'),
});
export type GenerateSeoOnlyInput = z.infer<typeof GenerateSeoOnlyInputSchema>;


const GenerateSeoOnlyOutputSchema = z.object({
  seoTitle: z.string().describe('An SEO-optimized title for the blog post. It MUST NOT exceed 60 characters.'),
  seoDescription: z.string().describe('An SEO-optimized meta description for the blog post. It MUST NOT exceed 160 characters.'),
  debugInfo: z.record(z.any()).optional().describe("Debugging information about the generation process."),
});
export type GenerateSeoOnlyOutput = z.infer<typeof GenerateSeoOnlyOutputSchema>;


const seoOnlyPrompt = ai.definePrompt({
    name: 'seoOnlyPrompt',
    input: { schema: GenerateSeoOnlyInputSchema },
    output: { schema: GenerateSeoOnlyOutputSchema.omit({ debugInfo: true }) },
    prompt: `You are an expert SEO specialist. Your only task is to generate an SEO-optimized title and meta description.

Based on the provided topic and keywords, generate:
1.  A concise, SEO-optimized title. IMPORTANT: The title must be a maximum of 60 characters.
2.  A compelling meta description. IMPORTANT: The description must be a maximum of 160 characters.

Topic: {{{topic}}}
Keywords: {{{keywords}}}
`,
});

const generateSeoOnlyFlow = ai.defineFlow({
    name: 'generateSeoOnlyFlow',
    inputSchema: GenerateSeoOnlyInputSchema,
    outputSchema: GenerateSeoOnlyOutputSchema,
}, async (input) => {
    const debugInfo: Record<string, any> = { mode: 'SEO Only' };
    
    try {
        const { output } = await seoOnlyPrompt(input, { model: input.model });
        if (!output) {
            throw new Error('AI returned empty or invalid output for SEO-only generation.');
        }
        return { ...output, debugInfo };
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("CRITICAL ERROR in generateSeoOnlyFlow:", error);
        debugInfo.criticalError = {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        };
        return {
            seoTitle: 'Error',
            seoDescription: `An error occurred during generation: ${errorMessage}`,
            debugInfo,
        };
    }
});

export async function generateSeoOnly(input: GenerateSeoOnlyInput): Promise<GenerateSeoOnlyOutput> {
    return generateSeoOnlyFlow(input);
}
