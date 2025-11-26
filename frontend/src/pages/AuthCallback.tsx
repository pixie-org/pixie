import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      if (!hasNavigated) {
        setHasNavigated(true);
        setTimeout(() => navigate("/"), 2000);
      }
      return;
    }

    // If we have a token in URL, wait for user to be loaded
    const token = searchParams.get("token");
    if (token) {
      // Once user is loaded (not loading and user exists), navigate
      if (!isLoading && user && !hasNavigated) {
        setStatus("success");
        setHasNavigated(true);
        setTimeout(() => navigate("/"), 1000);
      }
      
      // Timeout fallback - navigate after 3 seconds even if user not loaded
      const timeout = setTimeout(() => {
        if (!hasNavigated) {
          setStatus("success");
          setHasNavigated(true);
          navigate("/");
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    } else {
      // No token, navigate immediately
      if (!hasNavigated) {
        setHasNavigated(true);
        navigate("/");
      }
    }
  }, [searchParams, navigate, user, isLoading, hasNavigated]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            {status === "loading" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
                  <Loader2 className="relative h-16 w-16 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Completing authentication
                  </h2>
                  <p className="text-muted-foreground">
                    Please wait while we log you in...
                  </p>
                </div>
              </>
            )}
            
            {status === "success" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full"></div>
                  <CheckCircle2 className="relative h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Authentication successful
                  </h2>
                  <p className="text-muted-foreground">
                    Redirecting you to your dashboard...
                  </p>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
                  <XCircle className="relative h-16 w-16 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Authentication failed
                  </h2>
                  <p className="text-muted-foreground">
                    There was an error during authentication. Redirecting...
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

