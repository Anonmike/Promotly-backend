import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit, Calendar, Clock, ExternalLink, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PostListProps {
  posts: any[];
  isLoading: boolean;
}

export default function PostList({ posts, isLoading }: PostListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      setDeletingId(postId);
      return await apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete post",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "scheduled":
        return "secondary";
      case "failed":
        return "destructive";
      case "draft":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <ExternalLink className="h-3 w-3" />;
      case "scheduled":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Edit className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-500 mb-4">
          No posts match your current filters. Try adjusting your search criteria.
        </p>
        <Button variant="outline">Clear Filters</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Post Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <p className="text-gray-900 leading-relaxed">{post.content}</p>
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      <span>{post.mediaUrls.length} media file(s)</span>
                    </div>
                  )}
                </div>
                
                {/* Status Badge */}
                <Badge variant={getStatusColor(post.status)} className="flex items-center space-x-1">
                  {getStatusIcon(post.status)}
                  <span className="capitalize">{post.status}</span>
                </Badge>
              </div>

              {/* Platforms */}
              <div className="flex flex-wrap gap-2">
                {post.platforms.map((platform: string) => (
                  <Badge key={platform} variant="outline" className="text-xs capitalize">
                    {platform}
                  </Badge>
                ))}
              </div>

              {/* Schedule Info */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {post.status === "published" ? "Published" : "Scheduled for"}{" "}
                      {new Date(
                        post.status === "published" && post.publishedAt 
                          ? post.publishedAt 
                          : post.scheduledFor
                      ).toLocaleString()}
                    </span>
                  </div>
                  {post.status === "failed" && post.errorMessage && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">{post.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {post.status === "draft" && (
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingId === post.id}
                      >
                        {deletingId === post.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this post? This action cannot be undone.
                          {post.status === "scheduled" && (
                            <span className="block mt-2 font-medium text-amber-700">
                              This will cancel the scheduled posting.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePostMutation.mutate(post.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
