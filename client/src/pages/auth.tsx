import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { Calendar, TrendingUp, Users, Zap } from "lucide-react";
import promotlyLogo from "@/assets/promotly-logo.png";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Left Side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={promotlyLogo} alt="Promotly" className="h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Promotly</h1>
            <p className="text-gray-600 mt-2">Your social media scheduling companion</p>
          </div>

          {/* Authentication Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Welcome back! Sign in to your account to continue.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignIn 
                    routing="hash"
                    signUpUrl="#"
                    afterSignInUrl="/"
                    appearance={{
                      elements: {
                        formButtonPrimary: 
                          "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                        card: "shadow-none border-0 p-0",
                        headerTitle: "hidden",
                        socialButtonsBlockButton: 
                          "border border-gray-300 hover:bg-gray-50 text-gray-700",
                        formFieldInput: 
                          "border border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                        footerActionLink: "text-blue-600 hover:text-blue-700",
                      },
                    }}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{" "}
                      <button
                        onClick={() => setActiveTab("signup")}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sign up here
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join thousands of users who trust Promotly with their social media.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignUp 
                    routing="hash"
                    signInUrl="#"
                    afterSignUpUrl="/"
                    appearance={{
                      elements: {
                        formButtonPrimary: 
                          "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                        card: "shadow-none border-0 p-0",
                        headerTitle: "hidden",
                        socialButtonsBlockButton: 
                          "border border-gray-300 hover:bg-gray-50 text-gray-700",
                        formFieldInput: 
                          "border border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                        footerActionLink: "text-blue-600 hover:text-blue-700",
                      },
                    }}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <button
                        onClick={() => setActiveTab("signin")}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white p-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-6">
            Schedule, Publish, and Analyze
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            Streamline your social media presence across all platforms with our powerful scheduling and analytics tools.
          </p>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Scheduling</h3>
                <p className="text-sm text-blue-100">
                  Schedule posts across multiple platforms simultaneously
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Advanced Analytics</h3>
                <p className="text-sm text-blue-100">
                  Track engagement and optimize your content strategy
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Multi-Platform</h3>
                <p className="text-sm text-blue-100">
                  Connect Twitter, Facebook, LinkedIn, and more
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Automation</h3>
                <p className="text-sm text-blue-100">
                  Set it and forget it with intelligent automation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}