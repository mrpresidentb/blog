'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';

const formSchema = z.object({
  topic: z.string().min(5, {
    message: 'Topic must be at least 5 characters long.',
  }).max(100, {
    message: 'Topic must be at most 100 characters long.',
  }),
  keywords: z.string().min(3, {
      message: 'Keywords must be at least 3 characters long.'
  }).max(150, {
      message: 'Keywords must be at most 150 characters long.'
  }),
});

type BlogFormValues = z.infer<typeof formSchema>;

interface BlogFormProps {
  onGenerate: (values: BlogFormValues) => void;
  loading: boolean;
}

export function BlogForm({ onGenerate, loading }: BlogFormProps) {
  const form = useForm<BlogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      keywords: '',
    },
    mode: 'onChange',
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Content Details</CardTitle>
        <CardDescription>Provide the topic and keywords for your new blog post.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-8">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog Post Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Future of Renewable Energy" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be the main subject of your article.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Keywords</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., solar, wind, geothermal, sustainability" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated keywords for search engine optimization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={loading || !form.formState.isValid}
              className="w-full transition-all duration-300 ease-in-out hover:scale-105 active:scale-100"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-5 w-5" />
              )}
              Generate Post
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
