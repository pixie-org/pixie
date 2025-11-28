import { useEffect, useRef, useState } from "react";
import { InspectorOAuthClientProvider } from "@/lib/mcp/auth";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { useToast } from "@/lib/mcp/hooks/useToast";
import { SESSION_KEYS, getServerSpecificKey } from "@/lib/mcp/constants";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

import {
  generateOAuthErrorDescription,
  parseOAuthCallbackParams,
} from "@/lib/mcp/utils/oauthUtils";

interface OAuthCallbackProps {
  maxWaitTime?: number; // Timeout in milliseconds for waiting for token
}

type AuthStatus = "processing" | "success" | "error" | "timeout";

const McpOAuthCallback = ({ maxWaitTime = 20000 }: OAuthCallbackProps) => {
  const { toast } = useToast();
  const hasProcessedRef = useRef(false);
  const [status, setStatus] = useState<AuthStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      // Skip if we've already processed this callback
      if (hasProcessedRef.current) {
        return;
      }
      hasProcessedRef.current = true;

      const notifyError = (description: string) => {
        toast({
          title: "OAuth Authorization Error",
          description,
          variant: "destructive",
        });
        setStatus("error");
        setErrorMessage(description);
      };

      const params = parseOAuthCallbackParams(window.location.search);
      if (!params.successful) {
        const errorDesc = generateOAuthErrorDescription(params);
        notifyError(errorDesc);
        return;
      }

      const serverUrl = sessionStorage.getItem(SESSION_KEYS.SERVER_URL);
      if (!serverUrl) {
        notifyError("Missing Server URL");
        return;
      }

      let result;
      try {
        // Create an auth provider with the current server URL
        const serverAuthProvider = new InspectorOAuthClientProvider(serverUrl);

        result = await auth(serverAuthProvider, {
          serverUrl,
          authorizationCode: params.code,
        });
      } catch (error) {
        console.error("OAuth callback error:", error);
        const errorMsg = `Unexpected error occurred: ${error}`;
        notifyError(errorMsg);
        return;
      }

      if (result !== "AUTHORIZED") {
        const errorMsg = `Expected to be authorized after providing auth code, got: ${result}`;
        notifyError(errorMsg);
        return;
      }

      toast({
        title: "Success",
        description: "Successfully authenticated with OAuth",
        variant: "default",
      });
      // Wait for token to be available
      const key = getServerSpecificKey(SESSION_KEYS.TOKENS, serverUrl);
      const waitForToken = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const checkInterval = 200; // Check every 200ms
          
          const checkToken = () => {
            const token = localStorage.getItem(key);
            if (token) {
              setStatus("success");
              resolve();
              return;
            }
            if (Date.now() - startTime > maxWaitTime) {
              setStatus("timeout");
              setErrorMessage("Authorization timed out. Please try again.");
              reject(new Error("Timeout waiting for token"));
              return;
            }
            setTimeout(checkToken, checkInterval);
          };

          checkToken();
        });
      };
      
      waitForToken()
        .then(() => {
          setTimeout(() => {
            try {
            window.close();
            } catch (e) {
            console.debug("Could not close window:", e);
            }
          }, 1500);
        })
        .catch(() => {});
    };

    handleCallback().finally(() => {
      window.history.replaceState({}, document.title, "/");
    });
  }, [toast, maxWaitTime]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      {status === "processing" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg text-gray-500">Processing OAuth callback...</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-lg text-gray-700">Successfully authenticated!</p>
        </>
      )}
      {(status === "error" || status === "timeout") && (
        <>
          <XCircle className="h-8 w-8 text-red-500" />
          <p className="text-lg text-gray-700">
            {errorMessage || "An error occurred during authentication"}
          </p>
        </>
      )}
    </div>
  );
};

export default McpOAuthCallback;
