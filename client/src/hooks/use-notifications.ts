import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

export function useNotifications() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastPostCountRef = useRef<number>(0);
  const seenPostIdsRef = useRef<Set<string>>(new Set());

  // Poll for posts every 10 seconds to detect status changes
  const { data: postsData } = useQuery({
    queryKey: ["/api/posts"],
    enabled: isSignedIn,
    refetchInterval: 10000, // Check every 10 seconds
  });

  const posts = postsData?.posts || [];

  useEffect(() => {
    if (!posts.length) return;

    // Check for newly published posts
    const publishedPosts = posts.filter((post: any) => 
      post.status === 'published' && 
      !seenPostIdsRef.current.has(`published-${post.id}`)
    );

    // Check for failed posts
    const failedPosts = posts.filter((post: any) => 
      post.status === 'failed' && 
      !seenPostIdsRef.current.has(`failed-${post.id}`)
    );

    // Check for newly scheduled posts
    const scheduledPosts = posts.filter((post: any) => 
      post.status === 'scheduled' && 
      !seenPostIdsRef.current.has(`scheduled-${post.id}`)
    );

    // Show notifications for published posts
    publishedPosts.forEach((post: any) => {
      toast({
        title: "Post Published! 🎉",
        description: `Your post "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" was successfully published to ${post.platforms.join(', ')}.`,
        duration: 5000,
      });
      seenPostIdsRef.current.add(`published-${post.id}`);
    });

    // Show notifications for failed posts
    failedPosts.forEach((post: any) => {
      toast({
        title: "Post Failed",
        description: `Your post "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}" failed to publish. ${post.errorMessage || 'Please check your social account connections.'}`,
        variant: "destructive",
        duration: 8000,
      });
      seenPostIdsRef.current.add(`failed-${post.id}`);
    });

    // Show notifications for newly scheduled posts (only if this isn't the initial load)
    if (lastPostCountRef.current > 0) {
      scheduledPosts.forEach((post: any) => {
        const scheduledDate = new Date(post.scheduledFor);
        toast({
          title: "Post Scheduled",
          description: `Your post will be published on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}.`,
          duration: 4000,
        });
        seenPostIdsRef.current.add(`scheduled-${post.id}`);
      });
    }

    lastPostCountRef.current = posts.length;
  }, [posts, toast]);

  // Calculate notification counts for the bell icon
  const failedPosts = posts.filter((post: any) => post.status === 'failed').length;
  const recentSuccessfulPosts = posts.filter((post: any) => 
    post.status === 'published' && 
    new Date(post.updatedAt || post.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;

  return {
    notificationCount: failedPosts + recentSuccessfulPosts,
    failedPosts,
    recentSuccessfulPosts,
  };
}