'use server';

/**
 * @fileOverview This file defines a Genkit flow for collecting user feedback on generated blog posts.
 *
 * The flow takes a blog post and a user rating (thumbs up/down) as input.
 * It then stores this feedback for future analysis and model improvement.
 *
 * @exports {
 *   improveBlogPost: (input: ImproveBlogPostInput) => Promise<ImproveBlogPostOutput>;
 *   ImproveBlogPostInput: type
 *   ImproveBlogPostOutput: type
 * }
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow.
const ImproveBlogPostInputSchema = z.object({
  blogPost: z.string().describe('The generated blog post content.'),
  rating: z.enum(['up', 'down']).describe('User rating of the blog post (up or down).'),
});
export type ImproveBlogPostInput = z.infer<typeof ImproveBlogPostInputSchema>;

// Define the output schema for the flow.
const ImproveBlogPostOutputSchema = z.object({
  success: z.boolean().describe('Indicates whether the feedback was successfully recorded.'),
  message: z.string().describe('A message indicating the status of the feedback process.'),
});
export type ImproveBlogPostOutput = z.infer<typeof ImproveBlogPostOutputSchema>;


// Define the Genkit flow.
const improveBlogPostFlow = ai.defineFlow(
  {
    name: 'improveBlogPostFlow',
    inputSchema: ImproveBlogPostInputSchema,
    outputSchema: ImproveBlogPostOutputSchema,
  },
  async input => {
    // In a real application, you would store the feedback in a database or other persistent storage.
    // For this example, we simply log the feedback to the console.
    console.log('Received blog post feedback:', input);

    // Simulate a successful feedback recording.
    return {
      success: true,
      message: 'Feedback successfully recorded.',
    };
  }
);

/**
 * Asynchronously records user feedback for a given blog post.
 * This function serves as a wrapper around the `improveBlogPostFlow`.
 *
 * @param {ImproveBlogPostInput} input - The input containing the blog post content and user rating.
 * @returns {Promise<ImproveBlogPostOutput>} A promise that resolves to an object indicating the success of the feedback recording.
 */
export async function improveBlogPost(input: ImproveBlogPostInput): Promise<ImproveBlogPostOutput> {
  return improveBlogPostFlow(input);
}
