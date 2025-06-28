import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PlatformSelectorProps {
  value: string[];
  onChange: (platforms: string[]) => void;
}

const platforms = [
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Share your thoughts in 280 characters",
    color: "bg-sky-500",
    textColor: "text-sky-700",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect with friends and family",
    color: "bg-blue-600",
    textColor: "text-blue-700",
    available: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional networking platform",
    color: "bg-blue-700",
    textColor: "text-blue-800",
    available: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share photos and stories",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    textColor: "text-purple-700",
    available: false, // Limited API access
  },
];

export default function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  // Get connected accounts to determine platform availability
  const { data: accountsData } = useQuery({
    queryKey: ["/api/social-accounts"],
  });

  const connectedAccounts = (accountsData as { accounts: any[] })?.accounts || [];
  const connectedPlatforms = new Set(connectedAccounts.map(account => account.platform));

  const togglePlatform = (platformId: string) => {
    // Only allow selection if platform is connected
    if (!connectedPlatforms.has(platformId)) return;
    
    const newValue = value.includes(platformId)
      ? value.filter(id => id !== platformId)
      : [...value, platformId];
    
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const isSelected = value.includes(platform.id);
          const isConnected = connectedPlatforms.has(platform.id);
          const isDisabled = !isConnected;
          
          return (
            <Card
              key={platform.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200"
                  : isDisabled
                  ? "opacity-50 cursor-not-allowed bg-gray-50"
                  : "hover:shadow-md hover:border-gray-300"
              }`}
              onClick={() => togglePlatform(platform.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {platform.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{platform.name}</h3>
                        {isConnected ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{platform.description}</p>
                    </div>
                  </div>
                  
                  {isConnected && (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Selected platforms:</span>
          <div className="flex flex-wrap gap-2">
            {value.map((platformId) => {
              const platform = platforms.find(p => p.id === platformId);
              return platform ? (
                <Badge key={platformId} variant="default" className={platform.textColor}>
                  {platform.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}

      {value.length === 0 && connectedPlatforms.size > 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Please select at least one platform to publish your post.
        </p>
      )}

      {connectedPlatforms.size === 0 && (
        <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          Connect your social media accounts first to start scheduling posts. 
          <a href="/social-accounts" className="underline ml-1">Go to Social Accounts</a>
        </p>
      )}
    </div>
  );
}
