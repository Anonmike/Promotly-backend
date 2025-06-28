import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, AlertCircle, CheckCircle, Info } from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedPosts: number;
  recentSuccessfulPosts: number;
}

export function NotificationModal({ isOpen, onClose, failedPosts, recentSuccessfulPosts }: NotificationModalProps) {
  const hasFailedPosts = failedPosts > 0;
  const hasSuccessfulPosts = recentSuccessfulPosts > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>Notifications</span>
          </DialogTitle>
          <DialogDescription>
            Your recent post activity and updates
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasFailedPosts && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Failed Posts</h4>
                <p className="text-sm text-red-700 mt-1">
                  {failedPosts} post{failedPosts !== 1 ? 's' : ''} failed to publish. 
                  Check your Posts page for details and retry.
                </p>
                <Badge variant="destructive" className="mt-2">
                  {failedPosts} failed
                </Badge>
              </div>
            </div>
          )}
          
          {hasSuccessfulPosts && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900">Recent Success</h4>
                <p className="text-sm text-green-700 mt-1">
                  {recentSuccessfulPosts} post{recentSuccessfulPosts !== 1 ? 's' : ''} successfully published in the last 24 hours.
                </p>
                <Badge variant="default" className="mt-2 bg-green-600">
                  {recentSuccessfulPosts} published
                </Badge>
              </div>
            </div>
          )}
          
          {!hasFailedPosts && !hasSuccessfulPosts && (
            <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">All Clear</h4>
                <p className="text-sm text-blue-700 mt-1">
                  No recent notifications. Your posts are running smoothly!
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {hasFailedPosts && (
            <Button onClick={() => window.location.href = '/posts'}>
              View Posts
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription>
            Customize your Promotly experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center py-8">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              We're working on advanced settings to help you customize your social media management experience.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">Planned Features:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Notification preferences</li>
                <li>• Default posting times</li>
                <li>• Content templates</li>
                <li>• Account management</li>
                <li>• Privacy settings</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button disabled>
            Stay Updated
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}