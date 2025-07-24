# Blogenius: Your AI-Powered Blog Writing Assistant

Blogenius is a web application built with Next.js and Genkit that helps users create high-quality, engaging, and SEO-optimized blog posts effortlessly. By simply providing a topic and some keywords, users can generate complete articles, including unique AI-generated images and their corresponding metadata.

## Key Features

-   **AI-Powered Content Generation**: Leverages powerful generative AI models (like Google's Gemini) to write complete blog posts on any given topic.
-   **Customizable Output**: Users can specify the desired length, tone, and keywords to ensure the generated content aligns with their brand voice and SEO strategy.
-   **AI Image Generation**: Automatically creates two unique, contextually relevant images for each blog post, complete with descriptive alt text, titles, and captions to improve engagement and SEO.
-   **Regenerate Images**: If the initial set of images isn't suitable, users can generate a new set with a single click.
-   **Interactive Preview**: A rich interface allows users to preview the generated post, view the raw HTML, and inspect the detailed image metadata.
-   **Developer-Focused Output**: An "Output" tab provides raw JSON and logs from the AI generation process, making it easy to debug and understand the backend logic.
-   **Feedback Mechanism**: Users can provide feedback on the quality of the generated content, helping to refine the underlying prompts and models over time.

## Technology Stack

-   **Frontend**: [Next.js](https://nextjs.org/) with React and TypeScript.
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/) for a modern, accessible, and customizable component library.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first styling approach.
-   **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) to orchestrate calls to Google's Gemini models for both text and image generation.
-   **Backend Services**: Deployed on [Firebase App Hosting](https://firebase.google.com/docs/hosting).

## How to Get Started

1.  **Provide Content Details**: Fill out the form on the left with your blog post topic, SEO keywords, and select your desired model and article length.
2.  **Generate Images (Optional)**: Toggle the "Include AI Images" switch to generate images along with your post.
3.  **Click Generate**: Press the "Generate Post" button and watch as Blogenius crafts your article and images.
4.  **Review and Use**: Preview the content, copy the HTML, or inspect the image details from the respective tabs.

This project is a demonstration of how modern AI tools can be integrated into a web application to create powerful and practical solutions.
