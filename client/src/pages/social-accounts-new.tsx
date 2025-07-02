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
import { Twitter, Facebook, Linkedin, Trash2, CheckCircle, AlertCircle, ExternalLink, Copy, Cookie, RefreshCw } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  accountName: string;
  isActive: boolean;
  createdAt: string;
  isConnected?: boolean;
  status?: string;
  authMethod?: string;
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

  const platforms = [
    { id: "twitter", name: "Twitter/X", icon: Twitter, color: "bg-blue-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  ];

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
        <div className="text-center py-8">
          <p>Loading your accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Social Media Accounts</h1>
        <p className="text-gray-600 mt-2">Connect your social media accounts to Promotly using OAuth or cookie authentication</p>
      </div>

      {/* Cookie Authentication Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cookie className="h-5 w-5 text-blue-600" />
            <span>Cookie Authentication</span>
          </CardTitle>
          <CardDescription>
            Add accounts using browser cookies for more reliable posting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">⚠️ Advanced Feature</h4>
            <ul className="text-amber-700 text-sm space-y-1">
              <li>• More reliable than OAuth when tokens expire</li>
              <li>• Requires manual cookie extraction from your browser</li>
              <li>• Cookies may need periodic updates</li>
              <li>• Works by automating browser actions</li>
            </ul>
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
                  Extract cookies from your browser to enable automated posting
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
                    placeholder="e.g., yourusername (without @)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cookies">Browser Cookies (JSON format)</Label>
                  <Textarea
                    id="cookies"
                    value={cookieFormData.cookies}
                    onChange={(e) => setCookieFormData(prev => ({ ...prev, cookies: e.target.value }))}
                    placeholder='[{"name":"auth_token","value":"abc123","domain":".twitter.com","path":"/","secure":true}]'
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    <p className="font-medium mb-2">To extract cookies:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open browser developer tools (F12)</li>
                      <li>Go to {cookieFormData.platform || 'the platform'} website and log in</li>
                      <li>Go to Application/Storage tab → Cookies</li>
                      <li>Copy important cookies (auth_token, session_id, etc.)</li>
                      <li>Format as JSON array with name, value, domain, path</li>
                    </ol>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => cookieAuthMutation.mutate(cookieFormData)}
                    disabled={!cookieFormData.platform || !cookieFormData.accountName || !cookieFormData.cookies || cookieAuthMutation.isPending}
                    className="flex-1"
                  >
                    {cookieAuthMutation.isPending ? "Validating..." : "Connect Account"}
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
        </CardContent>
      </Card>

      {/* Connected Accounts */}
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
                      <h4 className="font-semibold capitalize">{account.platform}</h4>
                      <p className="text-sm text-gray-600">@{account.accountName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={account.isConnected === false ? "destructive" : "default"} className="text-xs">
                          {account.isConnected === false ? "Disconnected" : "Connected"}
                        </Badge>
                        {account.authMethod && (
                          <Badge variant="outline" className="text-xs">
                            {account.authMethod === 'cookies' ? 'Cookie Auth' : 'OAuth'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshAccountMutation.mutate(account.id)}
                      disabled={refreshAccountMutation.isPending}
                      title="Refresh connection status"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshAccountMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(account.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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