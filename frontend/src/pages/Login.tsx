import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  const handleLogin = async (provider: "google" | "github") => {
    setLoadingProvider(provider);
    try {
      await login(provider);
    } catch (error) {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                <img 
                  src="/logo.png" 
                  alt="Pixie" 
                  className="relative h-20 w-20 rounded-2xl shadow-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Welcome to Pixie
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to your account or create a new one to get started
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            <div className="space-y-3">
              <Button
                size="lg"
                onClick={() => handleLogin("google")}
                disabled={loadingProvider !== null}
                className="w-full h-12 text-base font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
                variant="outline"
              >
                {loadingProvider === "google" ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <Button
                size="lg"
                onClick={() => handleLogin("github")}
                disabled={loadingProvider !== null}
                className="w-full h-12 text-base font-medium bg-[#24292e] hover:bg-[#24292e]/90 text-white transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {loadingProvider === "github" ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                Continue with GitHub
              </Button>
            </div>

            <div className="relative py-4">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-4 text-xs text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground leading-relaxed px-4">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your account will be created automatically upon first sign-in.
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}

