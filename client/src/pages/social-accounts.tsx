import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Twitter, Trash2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  accountName: string;
  isActive: boolean;
  createdAt: string;
}

export default function SocialAccounts() {
  const { toast } = useToast();

  // Check for connection success/error messages in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (connected === 'twitter') {
      toast({
        title: "Success!",
        description: "Twitter account connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      window.history.replaceState({}, '', window.location.pathname);

    } else if (error === 'twitter_auth_failed') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Twitter account. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error === 'twitter_session_expired') {
      toast({
        title: "Session Expired",
        description: "Your authentication session expired. Please try connecting again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error === 'twitter_auth_denied') {
      toast({
        title: "Authorization Denied",
        description: "Twitter authorization was cancelled.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["/api/accounts"],
  });

  const accounts = (accountsData as { accounts: SocialAccount[] })?.accounts || [];

  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("DELETE", `/api/social-accounts/${accountId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account removed",
        description: "Social media account has been disconnected successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove account",
        variant: "destructive",
      });
    },
  });

  const twitterOAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/twitter/init");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Redirecting to Twitter",
        description: "You'll be redirected to Twitter for authorization.",
      });
      // Redirect to Twitter authorization in the same window for proper callback handling
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize Twitter authorization",
        variant: "destructive",
      });
    },
  });

  const handleConnectTwitter = () => {
    twitterOAuthMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Media Accounts</h1>
          <p className="text-gray-600">Connect your social media accounts to start scheduling posts across platforms.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Twitter */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-500">
                  <Twitter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Twitter</h3>
                  <p className="text-sm text-gray-600">Share updates and engage with your Twitter audience</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {accounts.find(account => account.platform === 'twitter') ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Connected as {accounts.find(account => account.platform === 'twitter')?.accountName}</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(accounts.find(account => account.platform === 'twitter')!.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleConnectTwitter}
                    disabled={twitterOAuthMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{twitterOAuthMutation.isPending ? "Connecting..." : "Connect Twitter"}</span>
                  </Button>
                )}
              </div>
            </div>



            {/* Information Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>How it works</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• Click "Connect" to authorize Promotly to post on your behalf</p>
                  <p>• You'll be redirected to the platform's authorization page</p>
                  <p>• After approval, you'll return here with your account connected</p>
                  <p>• Connected accounts will appear in the platform selector when creating posts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}