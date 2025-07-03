import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Twitter, Facebook, Linkedin, Trash2, CheckCircle, AlertCircle, ExternalLink, Copy, Cookie, Globe, Monitor, Play, RefreshCw } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  accountName: string;
  isActive: boolean;
  createdAt: string;
  isConnected?: boolean;
  status?: string;
}

export default function SocialAccounts() {
  const { toast } = useToast();
  const [showOAuthComplete, setShowOAuthComplete] = useState(false);
  const [oauthVerifier, setOauthVerifier] = useState("");
  const [showCookieForm, setShowCookieForm] = useState(false);
  const [cookieFormData, setCookieFormData] = useState({
    platform: '',
    accountName: '',
    cookies: ''
  });
  const [autoExtractState, setAutoExtractState] = useState({
    isExtracting: false,
    sessionId: '',
    platform: '',
    showComplete: false,
    accountName: '',
    loginUrl: '',
    extractedCookies: ''
  });

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
    mutationFn: async (verifier: string) => {
      const response = await apiRequest("POST", "/api/auth/twitter/complete", {
        oauth_verifier: verifier
      });
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
        description: error instanceof Error ? error.message : "Failed to complete Twitter authorization",
        variant: "destructive",
      });
    },
  });

  const refreshAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("POST", `/api/social-accounts/${accountId}/refresh`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      toast({
        title: data.isConnected ? "Connected" : "Disconnected",
        description: data.message,
        variant: data.isConnected ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh account status",
        variant: "destructive",
      });
    },
  });

  const cookieAuthMutation = useMutation({
    mutationFn: async (data: { platform: string; accountName: string; cookies: string }) => {
      let cookies;
      try {
        cookies = JSON.parse(data.cookies);
      } catch (error) {
        throw new Error("Invalid cookie format. Please provide valid JSON.");
      }

      const response = await apiRequest("POST", "/api/social-accounts/cookies", {
        platform: data.platform,
        accountName: data.accountName,
        cookies
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setShowCookieForm(false);
      setCookieFormData({ platform: '', accountName: '', cookies: '' });
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect account with cookies",
        variant: "destructive",
      });
    },
  });

  const autoExtractStartMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest("POST", "/api/social-accounts/extract-cookies/start", { platform });
      return response.json();
    },
    onSuccess: (data) => {
      setAutoExtractState({
        isExtracting: true,
        sessionId: data.sessionId,
        platform: autoExtractState.platform,
        showComplete: true,
        accountName: '',
        loginUrl: data.loginUrl,
        extractedCookies: ''
      });
      toast({
        title: "Ready for Login",
        description: `Please open the login URL and follow the instructions to extract cookies.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start cookie extraction",
        variant: "destructive",
      });
    },
  });

  const autoExtractCompleteMutation = useMutation({
    mutationFn: async ({ sessionId, accountName, cookies }: { sessionId: string; accountName: string; cookies: string }) => {
      const response = await apiRequest("POST", "/api/social-accounts/extract-cookies/complete", { 
        sessionId, 
        accountName,
        cookies
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setAutoExtractState({
        isExtracting: false,
        sessionId: '',
        platform: '',
        showComplete: false,
        accountName: '',
        loginUrl: '',
        extractedCookies: ''
      });
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete cookie extraction",
        variant: "destructive",
      });
    },
  });

  const handleAutoExtract = (platform: string) => {
    setAutoExtractState(prev => ({ ...prev, platform }));
    autoExtractStartMutation.mutate(platform);
  };

  // Browser automation state and mutations
  const [browserState, setBrowserState] = useState({
    isOnboarding: false,
    platform: '',
    validating: false
  });

  const browserOnboardMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest("/api/browser/onboard", {
        method: "POST",
        body: JSON.stringify({ platform })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Browser Window Opened",
        description: `Please complete login for ${data.platform} in the browser window that opened.`,
      });
      setBrowserState(prev => ({ ...prev, isOnboarding: false }));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start browser onboarding",
        variant: "destructive",
      });
      setBrowserState(prev => ({ ...prev, isOnboarding: false }));
    },
  });

  const browserValidateMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest("/api/browser/validate", {
        method: "POST",
        body: JSON.stringify({ platform })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isValid ? "Session Valid" : "Session Expired",
        description: data.message,
        variant: data.isValid ? "default" : "destructive",
      });
      setBrowserState(prev => ({ ...prev, validating: false }));
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to validate session",
        variant: "destructive",
      });
      setBrowserState(prev => ({ ...prev, validating: false }));
    },
  });

  const browserConnectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest("/api/browser/connect", {
        method: "POST",
        body: JSON.stringify({ platform, accountName: `${platform} Browser Session` })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Connected",
        description: `${data.platform} account connected with browser automation`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect account",
        variant: "destructive",
      });
    },
  });

  const BrowserAutomationSection = () => {
    return (
      <div className="space-y-4">
        {platforms.map((platform) => {
          const account = accounts.find(acc => acc.platform === platform.id);
          const hasBrowserSession = account?.authMethod === 'browser_session';
          
          return (
            <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${platform.color}`}>
                  <platform.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-sm text-gray-600">
                    {hasBrowserSession ? "Browser session ready for automation" : "Login once to enable automated posting"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {hasBrowserSession ? (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="flex items-center space-x-1">
                      <Monitor className="h-3 w-3" />
                      <span>Browser Connected</span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBrowserState(prev => ({ ...prev, validating: true, platform: platform.id }));
                        browserValidateMutation.mutate(platform.id);
                      }}
                      disabled={browserState.validating && browserState.platform === platform.id}
                    >
                      {browserState.validating && browserState.platform === platform.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setBrowserState(prev => ({ ...prev, isOnboarding: true, platform: platform.id }));
                      browserOnboardMutation.mutate(platform.id);
                    }}
                    disabled={browserState.isOnboarding && browserState.platform === platform.id}
                    className="flex items-center space-x-2"
                  >
                    {browserState.isOnboarding && browserState.platform === platform.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>Start Login</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How Browser Automation Works</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Click "Start Login" to open a browser window</li>
            <li>2. Log into your social media account normally</li>
            <li>3. Close the browser when you're done</li>
            <li>4. Promotly will use this session for automated posting</li>
            <li>5. Sessions persist between application restarts</li>
          </ol>
        </div>
      </div>
    );
  };

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
        <p className="text-gray-600 mt-2">Connect your social media accounts to Promotly to start scheduling posts</p>
      </div>

      {/* Connection Methods */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Accounts</CardTitle>
            <CardDescription>
              Choose your preferred authentication method for each platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="browser" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="browser">Browser Automation</TabsTrigger>
                <TabsTrigger value="oauth">OAuth Authentication</TabsTrigger>
                <TabsTrigger value="auto-cookies">Auto Cookie Extract</TabsTrigger>
                <TabsTrigger value="cookies">Manual Cookies</TabsTrigger>
              </TabsList>
              
              <TabsContent value="browser" className="space-y-4 mt-6">
                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>New!</strong> Browser Automation uses persistent browser sessions for reliable posting. Log in once manually, then Promotly handles the rest automatically.</p>
                  <p className="mt-2 text-green-600">✓ Most reliable method ✓ Works with any platform ✓ No API limitations</p>
                </div>
                
                <BrowserAutomationSection />
              </TabsContent>
              
              <TabsContent value="oauth" className="space-y-4 mt-6">
                <div className="text-sm text-gray-600 mb-4">
                  <p>Secure OAuth authentication allows Promotly to post on your behalf using official platform APIs.</p>
                </div>
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
                    <Badge 
                      variant={twitterAccount.isConnected === false ? "destructive" : "default"} 
                      className="flex items-center space-x-1"
                    >
                      {twitterAccount.isConnected === false ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>Disconnected</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected as @{twitterAccount.accountName}</span>
                        </>
                      )}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshAccountMutation.mutate(twitterAccount.id)}
                      disabled={refreshAccountMutation.isPending}
                      title="Refresh connection status"
                    >
                      {refreshAccountMutation.isPending ? "..." : "↻"}
                    </Button>
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
                      <li>Click "Authorize app" on the Twitter page that opened</li>
                      <li>Look for a verification code in the URL or on the page</li>
                      <li>Copy the code and paste it below</li>
                      <li>Click "Complete Connection"</li>
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
                      onClick={() => completeOAuthMutation.mutate(oauthVerifier)}
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
          </TabsContent>
          
          <TabsContent value="auto-cookies" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Automatic cookie extraction opens a browser window where you can log in, then extracts cookies automatically.</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 font-medium mb-1">✨ Recommended Method</p>
                  <ul className="text-green-700 text-xs space-y-1">
                    <li>• Easy and user-friendly - just log in normally</li>
                    <li>• Automatically extracts all necessary cookies</li>
                    <li>• No technical knowledge required</li>
                    <li>• Most reliable authentication method</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Twitter Auto Extract */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-blue-500">
                      <Twitter className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Twitter/X</h3>
                      <p className="text-sm text-gray-600">Automatic login and cookie extraction</p>
                    </div>
                  </div>
                  <Button onClick={() => handleAutoExtract('twitter')}>
                    <Globe className="h-4 w-4 mr-2" />
                    Auto Connect
                  </Button>
                </div>

                {/* Facebook Auto Extract */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-blue-600">
                      <Facebook className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Facebook</h3>
                      <p className="text-sm text-gray-600">Automatic login and cookie extraction</p>
                    </div>
                  </div>
                  <Button onClick={() => handleAutoExtract('facebook')}>
                    <Globe className="h-4 w-4 mr-2" />
                    Auto Connect
                  </Button>
                </div>

                {/* LinkedIn Auto Extract */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-blue-700">
                      <Linkedin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">LinkedIn</h3>
                      <p className="text-sm text-gray-600">Automatic login and cookie extraction</p>
                    </div>
                  </div>
                  <Button onClick={() => handleAutoExtract('linkedin')}>
                    <Globe className="h-4 w-4 mr-2" />
                    Auto Connect
                  </Button>
                </div>
              </div>

              {/* Auto Extract Completion Dialog */}
              {autoExtractState.showComplete && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Complete Cookie Extraction</CardTitle>
                    <CardDescription>
                      Please complete the login process in the browser window, then return here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-100 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Step 1: Login</h4>
                      <p className="text-blue-800 text-sm mb-2">Click the link below to login to your account:</p>
                      <a 
                        href={autoExtractState.loginUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                      >
                        {autoExtractState.loginUrl}
                      </a>
                    </div>

                    <div className="p-4 bg-orange-100 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">Step 2: Extract Cookies</h4>
                      <ol className="text-orange-800 text-sm space-y-1 list-decimal list-inside">
                        <li>After logging in, press F12 to open developer tools</li>
                        <li>Go to Application tab (or Storage tab in Firefox)</li>
                        <li>Click "Cookies" in the left sidebar</li>
                        <li>Select the {autoExtractState.platform} domain</li>
                        <li>Copy all cookies and paste them below</li>
                      </ol>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="autoAccountName">Account Name</Label>
                      <Input
                        id="autoAccountName"
                        placeholder="e.g., My Business Account"
                        value={autoExtractState.accountName || ''}
                        onChange={(e) => setAutoExtractState(prev => ({ ...prev, accountName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cookiesInput">Cookies (JSON format)</Label>
                      <textarea
                        id="cookiesInput"
                        className="w-full h-24 p-2 border rounded resize-none font-mono text-xs"
                        placeholder="Paste the cookies JSON here..."
                        value={autoExtractState.extractedCookies}
                        onChange={(e) => setAutoExtractState(prev => ({ ...prev, extractedCookies: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => autoExtractCompleteMutation.mutate({
                          sessionId: autoExtractState.sessionId,
                          accountName: autoExtractState.accountName || '',
                          cookies: autoExtractState.extractedCookies
                        })}
                        disabled={!autoExtractState.accountName || !autoExtractState.extractedCookies || autoExtractCompleteMutation.isPending}
                        className="flex-1"
                      >
                        {autoExtractCompleteMutation.isPending ? "Extracting..." : "Complete Connection"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAutoExtractState({
                            isExtracting: false,
                            sessionId: '',
                            platform: '',
                            showComplete: false,
                            accountName: '',
                            loginUrl: '',
                            extractedCookies: ''
                          });
                        }}
                        disabled={autoExtractCompleteMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="cookies" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Cookie authentication uses your browser cookies to post directly to social media platforms.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 font-medium mb-1">⚠️ Advanced Feature</p>
                  <ul className="text-amber-700 text-xs space-y-1">
                    <li>• More reliable than OAuth for some platforms</li>
                    <li>• Requires manual cookie extraction from your browser</li>
                    <li>• Cookies may expire and need periodic updates</li>
                  </ul>
                </div>
              </div>
              
              {!showCookieForm ? (
                <Button onClick={() => setShowCookieForm(true)} className="w-full">
                  <Cookie className="h-4 w-4 mr-2" />
                  Add Account with Cookies
                </Button>
              ) : (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Cookie Authentication Setup</CardTitle>
                    <CardDescription>
                      Follow the steps below to extract cookies from your browser
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="platform">Platform</Label>
                      <select
                        id="platform"
                        className="w-full p-2 border rounded-md"
                        value={cookieFormData.platform}
                        onChange={(e) => setCookieFormData(prev => ({ ...prev, platform: e.target.value }))}
                      >
                        <option value="">Select Platform</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Username</Label>
                      <Input
                        id="accountName"
                        value={cookieFormData.accountName}
                        onChange={(e) => setCookieFormData(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="e.g., @yourusername"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cookies">Browser Cookies (JSON format)</Label>
                      <Textarea
                        id="cookies"
                        value={cookieFormData.cookies}
                        onChange={(e) => setCookieFormData(prev => ({ ...prev, cookies: e.target.value }))}
                        placeholder='[{"name":"session_id","value":"abc123","domain":".twitter.com"}]'
                        className="min-h-[100px] font-mono text-sm"
                      />
                      <div className="text-xs text-gray-500">
                        <p>To extract cookies:</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>Open browser developer tools (F12)</li>
                          <li>Go to the platform website and log in</li>
                          <li>In Console tab, run: <code className="bg-gray-100 px-1 rounded">JSON.stringify(document.cookie.split(';').map(c =&gt; (...)))</code></li>
                          <li>Copy the output and paste above</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => cookieAuthMutation.mutate(cookieFormData)}
                        disabled={!cookieFormData.platform || !cookieFormData.accountName || !cookieFormData.cookies || cookieAuthMutation.isPending}
                        className="flex-1"
                      >
                        {cookieAuthMutation.isPending ? "Connecting..." : "Connect Account"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCookieForm(false);
                          setCookieFormData({ platform: '', accountName: '', cookies: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
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