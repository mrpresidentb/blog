
'use client';

import { useState, useEffect } from 'react';
import { BlogForm } from '@/components/blog-form';
import { BlogDisplay } from '@/components/blog-display';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';
import type { GenerateBlogPostInput } from '@/ai/flows/generate-blog-post';
import { handleGeneratePost, handleFeedback, handleGenerateImages, AppGeneratePostOutput, handleRegenerateSeoTitle, handleRegenerateSeoDescription, AppGeneratePostInput } from '@/app/actions';
import type { ImageDetails } from '@/ai/flows/generate-blog-images';
import { useToast } from "@/hooks/use-toast";

interface BlogPostState {
  htmlContent: string;
  seoTitle: string;
  seoDescription: string;
  images: ImageDetails[] | null;
  rawOutput: string;
  imageRawOutput: string;
  isGeneratingImages: boolean;
  topic: string; // Store topic for regeneration
  keywords: string; // Store keywords for regeneration
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPostState | null>(null);
  const { toast } = useToast();

  const onGenerateImages = async () => {
    if (!blogPost || blogPost.htmlContent.includes("<h1>SEO Content Generated</h1>")) {
        toast({
            variant: "destructive",
            title: "Cannot Generate Images",
            description: "Images can only be generated for a full blog post, not in 'SEO Only' mode.",
        });
        return;
    }

    setBlogPost(prev => prev ? { ...prev, isGeneratingImages: true, images: [] } : null);
    toast({
        title: "Generating New Images...",
        description: "Please wait, this may take a moment.",
    });

    try {
        const imageResult = await handleGenerateImages(blogPost.htmlContent);
        
        if (imageResult.error) {
           toast({
              variant: "destructive",
              title: "Image Generation Failed",
              description: "Could not generate images. See Output tab for details.",
           });
           setBlogPost(prev => prev ? { ...prev, imageRawOutput: imageResult.rawOutput || 'Unknown error', isGeneratingImages: false } : null);
        } else {
           setBlogPost(prev => prev ? { ...prev, images: imageResult.images, isGeneratingImages: false, imageRawOutput: imageResult.rawOutput || '' } : null);
           if (imageResult.images && imageResult.images.length > 0) {
               toast({
                  title: "New Images Generated!",
                  description: "Your new images have been added to the post.",
               });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Image Generation Failed",
                    description: "Could not generate images for the post.",
                 });
            }
        }
      } catch(e) {
         const imageError = e instanceof Error ? e.message : JSON.stringify(e);
         toast({
            variant: "destructive",
            title: "Image Generation Error",
            description: "An unexpected error occurred. See Output tab.",
         });
         setBlogPost(prev => prev ? { ...prev, imageRawOutput: imageError, isGeneratingImages: false } : null);
      }
  };


  const onGenerate = async (data: AppGeneratePostInput) => {
    setLoading(true);
    setBlogPost(null);
    console.log('PAGE: Kicking off generation with data:', data);

    try {
      // Always generate the post first
      const result: AppGeneratePostOutput = await handleGeneratePost(data);
      console.log('PAGE: Received result from handleGeneratePost:', result);
      
      const initialPostState: BlogPostState = {
        htmlContent: result.htmlContent,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        images: data.generateImages && !data.seoOnly ? [] : null, // Empty array indicates images are coming
        rawOutput: result.rawOutput,
        imageRawOutput: '', // Initialize as empty
        isGeneratingImages: !!data.generateImages && !data.seoOnly,
        topic: data.topic, // Save topic
        keywords: data.keywords, // Save keywords
      };
      setBlogPost(initialPostState);

      if (result && result.seoTitle && !result.seoTitle.includes("Error")) {
        toast({
          title: "Success!",
          description: data.seoOnly ? "Your SEO metadata has been generated." : "Your blog post has been generated.",
        });

        // If images are requested, trigger generation now
        if (data.generateImages && !data.seoOnly) {
            // We reuse onGenerateImages, which now handles its own state updates for logs
            onGenerateImages(); 
        }

      } else {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: "Could not generate the content. Please see the output tab for details.",
        });
      }
    } catch (e) {
      const errorMessage = 'An unexpected error occurred. Please check the console and try again.';
      const rawError = e instanceof Error ? e.message : JSON.stringify(e, null, 2);
      setBlogPost({htmlContent: `<h1>Unexpected Error</h1><p>${errorMessage}</p>`, images: null, rawOutput: rawError, imageRawOutput: '', isGeneratingImages: false, seoTitle: 'Error', seoDescription: 'Error', topic: data.topic, keywords: data.keywords});
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      console.error('PAGE: An unexpected error occurred in onGenerate:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const onFeedback = async (rating: 'up' | 'down') => {
    if (!blogPost) return;
    const { success } = await handleFeedback(blogPost.htmlContent, rating);
    if (success) {
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Feedback Error",
        description: "Could not submit your feedback. Please try again.",
      });
    }
  };
  
  const onRegenerateSeoTitle = async () => {
    if (!blogPost) return;
    try {
        const { seoTitle } = await handleRegenerateSeoTitle({ topic: blogPost.topic, blogContent: blogPost.htmlContent, keywords: blogPost.keywords });
        setBlogPost(prev => prev ? { ...prev, seoTitle } : null);
        toast({ title: "SEO Title Regenerated!" });
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to regenerate title" });
    }
  };
  
  const onRegenerateSeoDescription = async () => {
      if (!blogPost) return;
      try {
          const { seoDescription } = await handleRegenerateSeoDescription({ topic: blogPost.topic, blogContent: blogPost.htmlContent, keywords: blogPost.keywords });
          setBlogPost(prev => prev ? { ...prev, seoDescription } : null);
          toast({ title: "SEO Description Regenerated!" });
      } catch (error) {
          toast({ variant: "destructive", title: "Failed to regenerate description" });
      }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-6 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-headline font-bold text-primary">Blogenius</h1>
        </div>
      </header>
      <main className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 p-6 items-start">
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2">
            <h2 className="text-4xl font-headline">Create your next masterpiece</h2>
            <p className="text-lg text-muted-foreground">
              Just provide a topic and some keywords, and let Blogenius craft a professional, engaging, and slightly humorous blog post for you.
            </p>
          </div>
          <BlogForm onGenerate={onGenerate} loading={loading} />
        </div>
        <div className="lg:mt-0">
          <Card className="h-full min-h-[60vh] shadow-lg">
            <CardContent className="p-2 h-full">
              {loading && !blogPost && <BlogDisplaySkeleton />}
              {blogPost && (
                <BlogDisplay 
                  htmlContent={blogPost.htmlContent}
                  seoTitle={blogPost.seoTitle}
                  seoDescription={blogPost.seoDescription}
                  images={blogPost.images}
                  isGeneratingImages={blogPost.isGeneratingImages}
                  rawOutput={blogPost.rawOutput}
                  imageRawOutput={blogPost.imageRawOutput}
                  onFeedback={onFeedback}
                  onRegenerateImages={onGenerateImages}
                  onRegenerateSeoTitle={onRegenerateSeoTitle}
                  onRegenerateSeoDescription={onRegenerateSeoDescription}
                />
              )}
              {!loading && !blogPost &&(
                 <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg p-8 text-center">
                    <div className="p-4 bg-background rounded-full mb-4">
                        <Wand2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <p className="mt-4 font-semibold text-lg text-muted-foreground">Your masterpiece awaits</p>
                    <p className="text-sm text-muted-foreground">The generated blog post will appear here.</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

const BlogDisplaySkeleton = () => (
  <div className="p-6 space-y-6">
    <Skeleton className="h-8 w-3/4 rounded-md" />
    <div className="space-y-4">
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-5/6 rounded-md" />
    </div>
     <div className="space-y-4">
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-3/4 rounded-md" />
    </div>
  </div>
);
