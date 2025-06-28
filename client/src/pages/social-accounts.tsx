import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Twitter, Facebook, Linkedin, Trash2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

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
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error === 'twitter_auth_failed') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Twitter account. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["/api/social-accounts"],
  });

  const accounts = (accountsData as { accounts: SocialAccount[] })?.accounts || [];

  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("DELETE", `/api/social-accounts/${accountId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
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
      // Redirect user to Twitter authorization
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

  const platforms = [
    { id: "twitter", name: "Twitter/X", icon: Twitter, color: "bg-blue-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  ];

  const handleConnectTwitter = () => {
    twitterOAuthMutation.mutate();
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    const Icon = platformData?.icon || Twitter;
    return <Icon className="h-5 w-5" />;
  };

  const getPlatformColor = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData?.color || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Social Media Accounts</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const twitterAccount = accounts.find(account => account.platform === 'twitter');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Media Accounts</h1>
        <p className="text-gray-600 mt-2">Connect your social media accounts to start scheduling posts</p>
      </div>

      {/* Available Platforms */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Available Platforms</CardTitle>
            <CardDescription>
              Connect your social media accounts using secure OAuth authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Twitter */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-500">
                  <Twitter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Twitter/X</h3>
                  <p className="text-sm text-gray-600">Schedule tweets and manage your Twitter presence</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {twitterAccount ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Connected as @{twitterAccount.accountName}</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(twitterAccount.id)}
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

            {/* Facebook - Coming Soon */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-600">
                  <Facebook className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Facebook</h3>
                  <p className="text-sm text-gray-600">Schedule posts and manage your Facebook pages</p>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            {/* LinkedIn - Coming Soon */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-700">
                  <Linkedin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">LinkedIn</h3>
                  <p className="text-sm text-gray-600">Schedule professional posts and manage your LinkedIn presence</p>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Your currently connected social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account: SocialAccount) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getPlatformColor(account.platform)}`}>
                      <div className="text-white">
                        {getPlatformIcon(account.platform)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.accountName}</h3>
                      <p className="text-sm text-gray-600 capitalize">{account.platform}</p>
                      <p className="text-xs text-gray-500">
                        Connected {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={account.isActive ? "default" : "secondary"}
                      className="flex items-center space-x-1"
                    >
                      {account.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}