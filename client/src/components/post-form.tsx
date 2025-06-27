import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import PlatformSelector from "./platform-selector";
import { Calendar, Clock, Send } from "lucide-react";

const postFormSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Content must be less than 500 characters"),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  scheduledFor: z.string().min(1, "Scheduled time is required"),
  mediaUrls: z.array(z.string()).optional(),
});

type PostFormData = z.infer<typeof postFormSchema>;

export default function PostForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<PostFormData>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: "",
      platforms: [],
      scheduledFor: "",
      mediaUrls: [],
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      // Convert the datetime-local input to ISO string
      const scheduledDate = new Date(data.scheduledFor);
      
      return await apiRequest("POST", "/api/posts/schedule", {
        ...data,
        scheduledFor: scheduledDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post scheduled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setLocation("/posts");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule post",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PostFormData) => {
    createPostMutation.mutate(data);
  };

  // Get current date and time for min attribute
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Content */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Post Content</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind? Share your thoughts..."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between text-sm text-gray-500">
                <FormMessage />
                <span>{field.value?.length || 0}/500</span>
              </div>
            </FormItem>
          )}
        />

        {/* Platform Selection */}
        <FormField
          control={form.control}
          name="platforms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Platforms</FormLabel>
              <FormControl>
                <PlatformSelector
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Media URLs */}
        <FormField
          control={form.control}
          name="mediaUrls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Media URLs (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter image URLs separated by commas"
                  value={field.value?.join(", ") || ""}
                  onChange={(e) => {
                    const urls = e.target.value
                      .split(",")
                      .map(url => url.trim())
                      .filter(url => url.length > 0);
                    field.onChange(urls);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Scheduled Time */}
        <FormField
          control={form.control}
          name="scheduledFor"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Schedule For</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    min={minDateTime}
                    {...field}
                    className="pr-10"
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Post will be scheduled and published automatically
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/posts")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPostMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createPostMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Post
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
