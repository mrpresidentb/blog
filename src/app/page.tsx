'use client';

import { useState } from 'react';
import { BlogForm } from '@/components/blog-form';
import { BlogDisplay } from '@/components/blog-display';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';
import type { GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { handleGeneratePost, handleFeedback } from '@/app/actions';
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [blogPost, setBlogPost] = useState<GenerateBlogPostOutput | null>(null);
  const { toast } = useToast();

  const onGenerate = async (data: { topic: string; keywords: string }) => {
    setLoading(true);
    setBlogPost(null);
    console.log('PAGE: Kicking off generation with data:', data);
    try {
      const result = await handleGeneratePost(data);
      console.log('PAGE: Received result from handleGeneratePost:', result);
      if (result && result.htmlContent && !result.htmlContent.includes("<h1>Error Generating Post</h1>")) {
        setBlogPost(result);
        toast({
          title: "Success!",
          description: "Your blog post has been generated.",
        })
      } else {
        // The action now returns an error object, so we display it directly.
        setBlogPost(result); 
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: "Could not generate the blog post. Please see the error message.",
        })
      }
    } catch (e) {
      const errorMessage = 'An unexpected error occurred. Please check the console and try again.';
      setBlogPost({htmlContent: `<h1>Unexpected Error</h1><p>${errorMessage}</p>`});
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
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
              {loading && <BlogDisplaySkeleton />}
              {blogPost && (
                <BlogDisplay 
                  htmlContent={blogPost.htmlContent}
                  onFeedback={onFeedback}
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
     <div className="space-y-4">
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-2/3 rounded-md" />
    </div>
  </div>
);
