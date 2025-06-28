import { SignIn } from "@clerk/clerk-react";
import { Link } from "wouter";
import promotlyLogo from "@/assets/promotly-logo.png";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-3 mb-6">
          <img src={promotlyLogo} alt="Promotly" className="h-10 w-10" />
          <span className="text-2xl font-bold text-gray-900">Promotly</span>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/signup">
            <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
              create a new account
            </span>
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignIn 
            fallbackRedirectUrl="/"
            signUpUrl="/signup"
          />
        </div>
      </div>
    </div>
  );
}