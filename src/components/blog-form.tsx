
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  model: z.string().default('googleai/gemini-2.5-pro'),
  articleLength: z.string().default('default'),
  customLength: z.coerce.number().optional(),
  highQuality: z.boolean().default(false),
  scraperType: z.enum(['standard', 'scraper_api']).default('standard'),
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
      model: 'googleai/gemini-2.5-pro',
      articleLength: 'default',
      customLength: undefined,
      highQuality: false,
      scraperType: 'standard',
      generateImages: false,
    },
    mode: 'onChange',
  });

  const articleLengthValue = useWatch({
    control: form.control,
    name: 'articleLength',
  });
  
  const highQualityValue = useWatch({
      control: form.control,
      name: 'highQuality',
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
                name="model"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Generation Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="googleai/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="googleai/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="googleai/gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the AI model for text generation.
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
                        <SelectItem value="shorter">Shorter (400-500 Words)</SelectItem>
                        <SelectItem value="short">Short (500-600 Words)</SelectItem>
                        <SelectItem value="medium">Medium (600-700 Words)</SelectItem>
                        <SelectItem value="long">Long Form (700-1000 Words)</SelectItem>
                        <SelectItem value="longer">Longer (1200-2000 Words)</SelectItem>
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
            
            {highQualityValue && (
                <FormField
                    control={form.control}
                    name="scraperType"
                    render={({ field }) => (
                        <FormItem className="space-y-3 rounded-lg border p-4">
                            <FormLabel className="text-base">Scraper Service</FormLabel>
                            <FormDescription>
                                ScraperAPI is more powerful and reliable, but may incur costs.
                            </FormDescription>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="standard" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Standard
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="scraper_api" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    ScraperAPI
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
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
