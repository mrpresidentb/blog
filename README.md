# Blogenius: Your AI-Powered Blog Writing Assistant

Blogenius is a sophisticated web application built with Next.js and Firebase Genkit, designed to empower users to create high-quality, engaging, and SEO-optimized blog posts effortlessly. By providing a topic and relevant keywords, users can leverage generative AI to produce complete articles, including unique AI-generated images and their corresponding metadata. The application offers multiple modes of generation, from quick drafts to in-depth, researched articles.

## Key Features & Logic

### 1. Multi-Mode Content Generation

Blogenius offers three distinct modes for content creation, catering to different needs and use cases.

#### a. Standard Mode
This is the default mode for quick and creative content generation.
- **Logic**: The AI model uses its vast internal knowledge to write an article based on the provided topic, keywords, and tone.
- **Customization**:
    - **Article Length**: Users can choose from pre-defined lengths (e.g., "Short," "Medium," "Long") or specify a custom number of sections for more granular control.
    - **Additional Instructions**: A dedicated text field allows users to provide specific guidance, such as focusing on a particular angle, maintaining a certain style, or including specific points. This instruction is passed directly to the AI writer.

#### b. High-Quality Mode (RAG)
For users who need more current, data-driven, and well-researched articles, this mode implements a Retrieval-Augmented Generation (RAG) pipeline.
- **Logic**:
    1.  **Search Query Generation**: The AI first generates a set of diverse Google search queries based on the user's topic to ensure comprehensive research.
    2.  **Web Search**: It performs a Google Custom Search for each query.
    3.  **Web Scraping**: The application scrapes the top unique URLs from the search results (up to 5) to gather content.
    4.  **Scraper Options**:
        - **Standard**: Uses a basic fetch request with various user-agents.
        - **ScraperAPI**: Utilizes a more robust, third-party service (`ScraperAPI`) that can render JavaScript, overcoming common anti-scraping measures.
    5.  **Relevance Filtering**: The AI analyzes the scraped content from each page to determine if it's relevant to the original topic, discarding irrelevant pages (like ads or menus).
    6.  **Synthesized Writing**: Finally, the AI writes a completely new article, synthesizing the information from the relevant scraped content. It is explicitly instructed **not** to copy the source material but to use it as a foundation for an original piece.

#### c. SEO Only Mode
This mode is a utility for quickly generating just the essential search engine metadata.
- **Logic**: It bypasses the entire article generation process. A specialized, lightweight AI prompt is used to generate only an SEO-optimized title (max 60 characters) and a meta description (max 160 characters) based on the topic and keywords.

### 2. AI Image Generation
Users can enhance their posts with unique, contextually relevant visuals.
- **Logic**:
    1.  If enabled, this process runs *after* the main blog content is generated.
    2.  First, the AI analyzes the full text of the generated article to create two descriptive, detailed prompts suitable for an image generation model.
    3.  Then, for each prompt, it calls an image generation model (`gemini-2.0-flash-preview-image-generation`) to create a unique image.
    4.  Finally, it generates rich metadata for each image (Alt Text, Title, Caption, Description) based on the image's prompt and the context of the blog post.
- **Regenerate Images**: If the initial set of images isn't suitable, users can generate a completely new set with a single click without having to regenerate the entire post.

### 3. SEO Metadata Management
The application provides powerful tools for managing SEO.
- **Integrated Generation**: As described above, the SEO title and description are generated alongside the main content.
- **Dedicated SEO Tab**: A specific tab in the output interface displays the SEO title and description, along with a character counter to check against recommended limits.
- **On-Demand Regeneration**: If the generated title or description is too long or not suitable, users can regenerate each one individually using dedicated "Regenerate" buttons. This uses a fast, targeted AI call that considers the original topic and the full article content for context.

### 4. Interactive & Developer-Focused Interface
The UI is designed to be both user-friendly and insightful for developers.
- **Live Preview**: A "Preview" tab renders the generated HTML content, including images, as it would appear on a live blog.
- **Code Views**: "HTML" and "Output" tabs allow users to view and copy the raw HTML code and inspect the detailed JSON logs from the AI generation process. This is invaluable for debugging, showing which models were used, what search queries were generated, and which pages were scraped in High-Quality mode.
- **Feedback Mechanism**: Users can provide a "thumbs up" or "thumbs down" rating on the quality of the generated content, which could be used to refine the underlying prompts and models over time.
- **Copy & Download**: Easy-to-use buttons for copying HTML, downloading the post as an `.html` file, and sharing.

## Technology Stack

-   **Frontend**: [Next.js](https://nextjs.org/) with React and TypeScript.
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/) for a modern, accessible, and customizable component library.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first styling approach.
-   **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) to orchestrate calls to Google's Gemini models for both text and image generation.
-   **Backend Services**: Deployed on [Firebase App Hosting](https://firebase.google.com/docs/hosting).
-   **Web Scraping**: A combination of a standard `axios` client and the external [ScraperAPI](https://www.scraperapi.com/) for robust data retrieval.
-   **Content Parsing**: [Mozilla's Readability.js](https://github.com/mozilla/readability) to extract the core article content from scraped HTML pages.
