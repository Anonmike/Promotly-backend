import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Twitter, Facebook, Linkedin, Trash2, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  accountName: string;
  isActive: boolean;
  createdAt: string;
}

export default function SocialAccounts() {
  const { toast } = useToast();
  const [showOAuthComplete, setShowOAuthComplete] = useState(false);
  const [oauthVerifier, setOauthVerifier] = useState("");

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
      // Show manual completion interface for localhost development
      setShowOAuthComplete(true);
      toast({
        title: "Twitter Authorization Required",
        description: "Click the authorization link, then return here to complete the connection.",
      });
      // Open Twitter authorization in new tab
      window.open(data.authUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize Twitter authorization",
        variant: "destructive",
      });
    },
  });

  const completeOAuthMutation = useMutation({
    mutationFn: async ({ platform, data }: { platform: string; data: any }) => {
      const response = await apiRequest("POST", `/api/auth/${platform}/complete`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setShowOAuthComplete(false);
      setOauthVerifier("");
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete authorization",
        variant: "destructive",
      });
    },
  });

  const facebookOAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/facebook/init");
      return response.json();
    },
    onSuccess: (data) => {
      setShowOAuthComplete(true);
      toast({
        title: "Facebook Authorization Required",
        description: "Click the authorization link, then return here to complete the connection.",
      });
      window.open(data.authUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize Facebook authorization",
        variant: "destructive",
      });
    },
  });

  const linkedinOAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/linkedin/init");
      return response.json();
    },
    onSuccess: (data) => {
      setShowOAuthComplete(true);
      toast({
        title: "LinkedIn Authorization Required",
        description: "Click the authorization link, then return here to complete the connection.",
      });
      window.open(data.authUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize LinkedIn authorization",
        variant: "destructive",
      });
    },
  });

  const platforms = [
    { id: "twitter", name: "Twitter/X", icon: Twitter, color: "bg-blue-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  ];

  const [currentPlatform, setCurrentPlatform] = useState<string>("");

  const handleConnectTwitter = () => {
    setCurrentPlatform("twitter");
    twitterOAuthMutation.mutate();
  };

  const handleConnectFacebook = () => {
    setCurrentPlatform("facebook");
    facebookOAuthMutation.mutate();
  };

  const handleConnectLinkedIn = () => {
    setCurrentPlatform("linkedin");
    linkedinOAuthMutation.mutate();
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
                    disabled={twitterOAuthMutation.isPending || showOAuthComplete}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{twitterOAuthMutation.isPending ? "Connecting..." : "Connect Twitter"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Manual OAuth Completion - Show only when needed */}
            {showOAuthComplete && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Complete Twitter Authorization</CardTitle>
                  <CardDescription className="text-blue-700">
                    After authorizing our app on Twitter, copy the verification code from the URL and paste it below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-100 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      {currentPlatform === "twitter" ? (
                        <>
                          <li>Click "Authorize app" on the Twitter page that opened</li>
                          <li>Look for a verification code in the URL or on the page</li>
                          <li>Copy the code and paste it below</li>
                          <li>Click "Complete Connection"</li>
                        </>
                      ) : (
                        <>
                          <li>Click "Continue" or "Authorize" on the {currentPlatform} page that opened</li>
                          <li>Copy the entire URL from the address bar after authorization</li>
                          <li>Paste the URL below (it contains the authorization code)</li>
                          <li>Click "Complete Connection"</li>
                        </>
                      )}
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oauth-verifier" className="text-blue-900">
                      Verification Code
                    </Label>
                    <Input
                      id="oauth-verifier"
                      value={oauthVerifier}
                      onChange={(e) => setOauthVerifier(e.target.value)}
                      placeholder="Enter the verification code from Twitter"
                      className="border-blue-300"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        if (currentPlatform === "twitter") {
                          completeOAuthMutation.mutate({ 
                            platform: "twitter", 
                            data: { oauth_verifier: oauthVerifier }
                          });
                        } else {
                          // For Facebook and LinkedIn, we need both code and state
                          const urlParams = new URLSearchParams(oauthVerifier);
                          const code = urlParams.get('code') || oauthVerifier;
                          const state = urlParams.get('state') || "";
                          
                          completeOAuthMutation.mutate({ 
                            platform: currentPlatform, 
                            data: { code, state }
                          });
                        }
                      }}
                      disabled={!oauthVerifier.trim() || completeOAuthMutation.isPending}
                      className="flex-1"
                    >
                      {completeOAuthMutation.isPending ? "Connecting..." : "Complete Connection"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowOAuthComplete(false);
                        setOauthVerifier("");
                      }}
                      disabled={completeOAuthMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Facebook */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-600">
                  <Facebook className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Facebook</h3>
                  <p className="text-sm text-gray-600">Schedule posts and manage your Facebook pages</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {accounts.find(account => account.platform === 'facebook') ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Connected as {accounts.find(account => account.platform === 'facebook')?.accountName}</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(accounts.find(account => account.platform === 'facebook')!.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleConnectFacebook}
                    disabled={facebookOAuthMutation.isPending || showOAuthComplete}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{facebookOAuthMutation.isPending ? "Connecting..." : "Connect Facebook"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-700">
                  <Linkedin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">LinkedIn</h3>
                  <p className="text-sm text-gray-600">Schedule professional posts and manage your LinkedIn presence</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {accounts.find(account => account.platform === 'linkedin') ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Connected as {accounts.find(account => account.platform === 'linkedin')?.accountName}</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(accounts.find(account => account.platform === 'linkedin')!.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleConnectLinkedIn}
                    disabled={linkedinOAuthMutation.isPending || showOAuthComplete}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{linkedinOAuthMutation.isPending ? "Connecting..." : "Connect LinkedIn"}</span>
                  </Button>
                )}
              </div>
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