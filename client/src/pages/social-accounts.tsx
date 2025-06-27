import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Twitter, Facebook, Linkedin, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  accountName: string;
  isActive: boolean;
  createdAt: string;
}

export default function SocialAccounts() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const { toast } = useToast();

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

  const addMutation = useMutation({
    mutationFn: async (data: { platform: string; accessToken: string; accountName: string }) => {
      const response = await apiRequest("POST", "/api/social-accounts", {
        platform: data.platform,
        accountId: data.accountName,
        accessToken: data.accessToken,
        accountName: data.accountName,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setShowAddForm(false);
      setSelectedPlatform("");
      toast({
        title: "Account connected",
        description: "Social media account has been connected successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect account",
        variant: "destructive",
      });
    },
  });

  const platforms = [
    { id: "twitter", name: "Twitter/X", icon: Twitter, color: "bg-blue-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  ];

  const handleAddAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    addMutation.mutate({
      platform: selectedPlatform,
      accessToken: formData.get("accessToken") as string,
      accountName: formData.get("accountName") as string,
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Media Accounts</h1>
          <p className="text-gray-600 mt-2">Connect your social media accounts to start scheduling posts</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Connected Accounts */}
      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
              <p className="text-gray-600 text-center mb-4">
                Connect your social media accounts to start scheduling and managing your posts
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                Connect Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account: SocialAccount) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${getPlatformColor(account.platform)} text-white`}>
                    {getPlatformIcon(account.platform)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.accountName}</h3>
                    <p className="text-sm text-gray-600 capitalize">{account.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={account.isActive ? "default" : "secondary"} className="flex items-center gap-1">
                    {account.isActive ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(account.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Social Media Account</CardTitle>
            <CardDescription>
              Add your social media account credentials to enable posting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <Button
                        key={platform.id}
                        type="button"
                        variant={selectedPlatform === platform.id ? "default" : "outline"}
                        className="flex items-center gap-2 justify-start"
                        onClick={() => setSelectedPlatform(platform.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {platform.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {selectedPlatform && (
                <>
                  <div>
                    <Label htmlFor="accountName">Account Name/Username</Label>
                    <Input
                      id="accountName"
                      name="accountName"
                      placeholder="@your_username"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input
                      id="accessToken"
                      name="accessToken"
                      type="password"
                      placeholder="Your API access token"
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedPlatform === "twitter" && 
                        "Get your Bearer Token from the Twitter Developer Portal"}
                      {selectedPlatform === "facebook" && 
                        "Get your Page Access Token from Facebook Developers"}
                      {selectedPlatform === "linkedin" && 
                        "Get your Access Token from LinkedIn Developer Platform"}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={addMutation.isPending}
                      className="flex-1"
                    >
                      {addMutation.isPending ? "Connecting..." : "Connect Account"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedPlatform("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Twitter Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter Integration Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to get Twitter API access:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">developer.twitter.com</a></li>
              <li>Create a new app or use an existing one</li>
              <li>Generate a Bearer Token in the "Keys and tokens" section</li>
              <li>Copy the Bearer Token and paste it in the form above</li>
              <li>Make sure your app has "Read and Write" permissions</li>
            </ol>
          </div>
          <p className="text-sm text-gray-600">
            Note: Twitter API access may require approval and has usage limits depending on your account type.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}