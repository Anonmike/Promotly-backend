import { SignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import promotlyLogo from "@/assets/promotly-logo.png";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-3 mb-6">
          <img src={promotlyLogo} alt="Promotly" className="h-12 w-12 drop-shadow-lg" />
          <span className="text-3xl font-bold text-gray-900 dark:text-white">Promotly</span>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Join Promotly today
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Start managing your social media like a pro
        </p>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <Link href="/signin">
            <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
              Sign in here
            </span>
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          <SignUp 
            fallbackRedirectUrl="/"
            signInUrl="/signin"
            appearance={{
              variables: {
                colorPrimary: "#3B82F6",
                colorBackground: "#FFFFFF",
                colorText: "#111827",
                colorTextSecondary: "#6B7280",
                colorInputBackground: "#F9FAFB",
                colorInputText: "#111827",
                borderRadius: "0.5rem",
                spacingUnit: "1rem"
              },
              elements: {
                rootBox: {
                  width: "100%"
                },
                card: {
                  boxShadow: "none",
                  border: "none",
                  backgroundColor: "transparent"
                },
                headerTitle: {
                  display: "none"
                },
                headerSubtitle: {
                  display: "none"
                },
                socialButtons: {
                  marginBottom: "1rem"
                },
                socialButtonsIconButton: {
                  borderRadius: "0.5rem",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  "&:hover": {
                    backgroundColor: "#F3F4F6"
                  }
                },
                formFieldInput: {
                  borderRadius: "0.5rem",
                  border: "1px solid #D1D5DB",
                  backgroundColor: "#F9FAFB",
                  "&:focus": {
                    borderColor: "#3B82F6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)"
                  }
                },
                formButtonPrimary: {
                  borderRadius: "0.5rem",
                  backgroundColor: "#3B82F6",
                  "&:hover": {
                    backgroundColor: "#2563EB"
                  }
                },
                footerActionLink: {
                  color: "#3B82F6",
                  "&:hover": {
                    color: "#2563EB"
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}