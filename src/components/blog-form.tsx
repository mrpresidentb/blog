'use client';

import { useForm, useWatch } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wand2, Loader2, Info } from 'lucide-react';
import type { GenerateBlogPostInput } from '@/ai/flows/generate-blog-post';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  articleLength: z.string().default('default'),
  customLength: z.coerce.number().optional(),
  highQuality: z.boolean().default(false),
  generateImages: z.boolean().default(false),
}).refine(data => {
    if (data.articleLength === 'custom') {
        return data.customLength !== undefined && data.customLength > 0;
    }
    return true;
}, {
    message: 'Please specify the number of sections.',
    path: ['customLength'],
});

type BlogFormValues = z.infer<typeof formSchema>;

interface BlogFormProps {
  onGenerate: (values: GenerateBlogPostInput & { generateImages?: boolean }) => void;
  loading: boolean;
}

export function BlogForm({ onGenerate, loading }: BlogFormProps) {
  const form = useForm<BlogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      keywords: '',
      articleLength: 'default',
      customLength: undefined,
      highQuality: false,
      generateImages: false,
    },
    mode: 'onChange',
  });

  const articleLengthValue = useWatch({
    control: form.control,
    name: 'articleLength',
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Content Details</CardTitle>
        <CardDescription>Provide the topic, keywords, and other options for your new blog post.</CardDescription>
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
            
            <FormField
                control={form.control}
                name="articleLength"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-1">
                        Article Length
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Choose the desired length for your article.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select article length" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="shorter">Shorter (2-3 Sections)</SelectItem>
                        <SelectItem value="short">Short (3-5 Sections)</SelectItem>
                        <SelectItem value="medium">Medium (5-7 Sections)</SelectItem>
                        <SelectItem value="long">Long Form (7-10 Sections)</SelectItem>
                        <SelectItem value="longer">Longer (10-12 Sections)</SelectItem>
                        <SelectItem value="custom">Custom Number of Sections</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            {articleLengthValue === 'custom' && (
                <FormField
                    control={form.control}
                    name="customLength"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Custom Number of Sections</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 4" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

             <FormField
                control={form.control}
                name="generateImages"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                        Include AI Images
                        </FormLabel>
                        <FormDescription>
                        Generate two unique images based on the article's content. This will take longer.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="highQuality"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                        High Quality Mode
                        </FormLabel>
                        <FormDescription>
                        The model will take more time to think and research for a better quality article.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
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
