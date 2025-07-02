import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationModal, SettingsModal } from "@/components/ui/modal";
import { 
  Home, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Settings,
  Bell,
  Menu,
  X
} from "lucide-react";
import promotlyLogo from "@/assets/promotly-logo.png";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { notificationCount, failedPosts, recentSuccessfulPosts } = useNotifications();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/posts", label: "Posts", icon: FileText },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/accounts", label: "Accounts", icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <img src={promotlyLogo} alt="Promotly" className="h-8 w-8" />
                <span className="text-xl font-bold text-gray-900">Promotly</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links - centered */}
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      isActive 
                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <SignedIn>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative" 
                onClick={() => setIsNotificationModalOpen(true)}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge 
                    variant={failedPosts > 0 ? "destructive" : "default"}
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={() => setIsSettingsModalOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>



              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2 animate-fade-in">
            <div className="grid grid-cols-4 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`w-full flex flex-col items-center space-y-1 h-auto py-2 ${
                        isActive 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        failedPosts={failedPosts}
        recentSuccessfulPosts={recentSuccessfulPosts}
      />
      
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </nav>
  );
}
