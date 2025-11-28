import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Settings, Zap, ArrowLeft, X, Plus, Info } from "lucide-react";
import { createToolkitSource, type ToolkitSourceDetail, type AuthenticationConfiguration } from "@/lib/api/tools";
import { useConnection } from "@/lib/mcp/hooks/useConnection";
import { DEFAULT_INSPECTOR_CONFIG } from "@/lib/mcp/constants";
import type { InspectorConfig } from "@/lib/mcp/configurationTypes";
import type { CustomHeaders } from "@/lib/mcp/types/customHeaders";
import { recordToHeaders } from "@/lib/mcp/types/customHeaders";
import { waitForOAuthToken } from "@/lib/mcp/utils/oauthUtils";

interface CreateMcpToolSourceProps {
  projectId: string;
  onSuccess?: (source: ToolkitSourceDetail, tools?: any[]) => void;
  onCancel?: () => void;
  showBackButton?: boolean;
  buttonText?: string;
  inDialog?: boolean;
}

const CreateMcpToolSource = ({
  projectId,
  onSuccess,
  onCancel,
  showBackButton = true,
  buttonText = "Create Source",
  inDialog = false
}: CreateMcpToolSourceProps) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transportType, setTransportType] = useState<"streamable-http">("streamable-http");
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("authentication");
  const [authType, setAuthType] = useState<"no_auth" | "bearer_token" | "oauth2">("no_auth");
  const [bearerToken, setBearerToken] = useState("");
  const [useCustomOAuthCredentials, setUseCustomOAuthCredentials] = useState(false);
  const [oauth2ClientId, setOauth2ClientId] = useState("");
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState("");
  const [oauth2Scope, setOauth2Scope] = useState("");
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [requestTimeout, setRequestTimeout] = useState<string>("30");
  
  // Calculate max wait time for OAuth token (convert seconds to milliseconds)
  const maxWaitTime = useMemo(() => {
    return requestTimeout ? parseFloat(requestTimeout) * 1000 : 30000;
  }, [requestTimeout]);
  
  // State to control when to test connection
  const [testConnectionParams, setTestConnectionParams] = useState<{
    url: string;
    transportType: "streamable-http";
    customHeaders: CustomHeaders;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthScope?: string;
    config: InspectorConfig;
  } | null>(null);

  // Initialize config - create a copy to avoid mutating the default
  const getConfig = (): InspectorConfig => {
    const baseConfig = { ...DEFAULT_INSPECTOR_CONFIG };
    if (requestTimeout) {
      baseConfig.MCP_SERVER_REQUEST_TIMEOUT = {
        ...baseConfig.MCP_SERVER_REQUEST_TIMEOUT,
        value: parseFloat(requestTimeout) * 1000, // Convert seconds to milliseconds
      };
    }
    return baseConfig;
  };

  // Use the connection hook
  const {
    connect,
    disconnect,
    connectionStatus,
    mcpClient,
    oauthTriggered,
  } = useConnection({
    transportType: testConnectionParams?.transportType || "streamable-http",
    command: "",
    args: "",
    sseUrl: testConnectionParams?.url || "",
    env: {},
    customHeaders: testConnectionParams?.customHeaders,
    oauthClientId: testConnectionParams?.oauthClientId,
    oauthClientSecret: testConnectionParams?.oauthClientSecret,
    oauthScope: testConnectionParams?.oauthScope,
    config: testConnectionParams?.config || getConfig(),
    connectionType: "direct",
  });

  // Track if we're waiting for connection to test
  const isTestingConnectionRef = useRef(false);
  const connectionResolveRef = useRef<((tools: any[]) => void) | null>(null);
  const connectionRejectRef = useRef<((error: Error) => void) | null>(null);
  const waitingForOAuthTokenRef = useRef(false);

  // Watch connection status and fetch tools when connected
  useEffect(() => {
    if (isTestingConnectionRef.current && connectionStatus === "connected" && mcpClient) {
      const fetchTools = async () => {
        try {
          const response = await mcpClient.listTools();
          const tools = response.tools || [];
          await disconnect(/** clearAuthProvider */ false);
          
          if (connectionResolveRef.current) {
            connectionResolveRef.current(tools);
            connectionResolveRef.current = null;
            connectionRejectRef.current = null;
            isTestingConnectionRef.current = false;
            waitingForOAuthTokenRef.current = false;
          }
        } catch (error) {
          await disconnect(/** clearAuthProvider */ true);
          if (connectionRejectRef.current) {
            connectionRejectRef.current(error as Error);
            connectionRejectRef.current = null;
            connectionResolveRef.current = null;
            isTestingConnectionRef.current = false;
            waitingForOAuthTokenRef.current = false;
          }
        }
      };
      fetchTools();
    } else if (isTestingConnectionRef.current && oauthTriggered && !waitingForOAuthTokenRef.current) {
      // OAuth was triggered (401 detected), wait for token to appear in localStorage
      waitingForOAuthTokenRef.current = true;
      const serverUrl = testConnectionParams?.url;
      if (!serverUrl) {
        // No server URL, can't wait for token
        if (connectionRejectRef.current) {
          connectionRejectRef.current(new Error("Failed to connect to MCP server"));
          connectionRejectRef.current = null;
          connectionResolveRef.current = null;
          isTestingConnectionRef.current = false;
          waitingForOAuthTokenRef.current = false;
        }
        return;
      }
      
      waitForOAuthToken(serverUrl, maxWaitTime)
        .then(() => {
          waitingForOAuthTokenRef.current = false;
          setTimeout(() => { connect(); }, 500);
        })
        .catch((error) => {
          waitingForOAuthTokenRef.current = false;
          if (connectionRejectRef.current) {
            connectionRejectRef.current(error);
            connectionRejectRef.current = null;
            connectionResolveRef.current = null;
            isTestingConnectionRef.current = false;
          }
        });
    } else if (isTestingConnectionRef.current && connectionStatus === "error" && !waitingForOAuthTokenRef.current) {
      if (connectionRejectRef.current) {
        connectionRejectRef.current(new Error("Failed to connect to MCP server"));
        connectionRejectRef.current = null;
        connectionResolveRef.current = null;
        isTestingConnectionRef.current = false;
      }
    }
  }, [connectionStatus, mcpClient, disconnect, oauthTriggered, testConnectionParams, connect, maxWaitTime]);

  // Auto-connect when test connection params are set
  useEffect(() => {
    if (testConnectionParams && !isTestingConnectionRef.current && connectionStatus === "disconnected") {
      isTestingConnectionRef.current = true;
      connect();
    }
  }, [testConnectionParams, connect, connectionStatus]);

  const handleMCPConnect = async () => {
    if (!name.trim()) {
      setCreateError("Please enter a name for the source");
      return;
    }

    if (!url.trim()) {
      setCreateError("Please enter a server URL");
      return;
    }

    if (authType === "bearer_token" && !bearerToken.trim()) {
      setCreateError("Please enter a bearer token");
      return;
    }

    if (authType === "oauth2" && useCustomOAuthCredentials) {
      if (!oauth2ClientId.trim()) {
        setCreateError("Please enter OAuth2 client ID");
        return;
      }
      if (!oauth2ClientSecret.trim()) {
        setCreateError("Please enter OAuth2 client secret");
        return;
      }
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // Build auth_config
      // Convert scope string to array (split by space, filter empty strings)
      const scopeArray = authType === "oauth2" 
        ? (oauth2Scope.trim() || "").split(/\s+/).filter(s => s.length > 0)
        : null;
      
      // For browser-based OAuth, we might have obtained a token during connection
      // Store it if available (though for browser OAuth, token is typically obtained on-demand)
      const authConfig: AuthenticationConfiguration = {
        type: authType,
        bearer_token: authType === "bearer_token" ? bearerToken.trim() : null,
        oauth2_client_id: authType === "oauth2" && useCustomOAuthCredentials ? oauth2ClientId.trim() : null,
        oauth2_client_secret: authType === "oauth2" && useCustomOAuthCredentials ? oauth2ClientSecret.trim() : null,
        oauth2_scope: scopeArray,
      };

      // Build custom headers in the format expected by useConnection
      const customHeadersObj: Record<string, string> = {};
      customHeaders.forEach((header) => {
        if (header.key.trim() && header.value.trim()) {
          customHeadersObj[header.key.trim()] = header.value.trim();
        }
      });

      // Add bearer token as Authorization header if using bearer_token auth
      if (authType === "bearer_token" && bearerToken.trim()) {
        customHeadersObj["Authorization"] = `Bearer ${bearerToken.trim()}`;
      }

      // Convert to CustomHeaders format
      const customHeadersForHook: CustomHeaders = recordToHeaders(customHeadersObj);

      // Prepare OAuth credentials
      const oauthClientId = authType === "oauth2" && useCustomOAuthCredentials 
        ? oauth2ClientId.trim() 
        : undefined;
      const oauthClientSecret = authType === "oauth2" && useCustomOAuthCredentials 
        ? oauth2ClientSecret.trim() 
        : undefined;
      const oauthScope = authType === "oauth2" 
        ? (oauth2Scope.trim() || "")
        : undefined;

      // Prepare config with timeout
      const testConfig: InspectorConfig = {
        ...getConfig(),
        MCP_SERVER_REQUEST_TIMEOUT: {
          ...getConfig().MCP_SERVER_REQUEST_TIMEOUT,
          value: maxWaitTime,
        },
      };

      // Test connection and fetch tools using useConnection hook
      // Reset any previous test state
      isTestingConnectionRef.current = false;
      connectionResolveRef.current = null;
      connectionRejectRef.current = null;
      waitingForOAuthTokenRef.current = false;
      
      // Disconnect any existing connection first
      if (connectionStatus !== "disconnected") {
        try {
          await disconnect(/** clearAuthProvider */ false);
          // Wait a bit for disconnect to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      
      const connectionTimeout = setTimeout(() => {
        if (connectionRejectRef.current && !waitingForOAuthTokenRef.current) {
          connectionRejectRef.current(new Error("Connection timeout: Failed to connect within 30 seconds"));
          connectionRejectRef.current = null;
          connectionResolveRef.current = null;
          isTestingConnectionRef.current = false;
          waitingForOAuthTokenRef.current = false;
          setTestConnectionParams(null);
        }
      }, maxWaitTime);
      
      const tools = await new Promise<any[]>((resolve, reject) => {
        connectionResolveRef.current = (tools) => {
          clearTimeout(connectionTimeout);
          resolve(tools);
        };
        connectionRejectRef.current = (error) => {
          clearTimeout(connectionTimeout);
          reject(error);
        };
        
        setTestConnectionParams({
          url: url.trim(),
          transportType: transportType,
          customHeaders: customHeadersForHook,
          oauthClientId,
          oauthClientSecret,
          oauthScope,
          config: testConfig,
        });
      });
      
      // Clear test connection params after test completes
      setTestConnectionParams(null);

      // Create the source with auth_config
      const sourceData = {
        name: name.trim(),
        source_type: "mcp_server",
        description: description.trim() || `${name.trim()} MCP server connection`,
        configuration: {
          transport: transportType,
          server_url: url.trim(),
          auth_config: authConfig,
          custom_headers: Object.keys(customHeadersObj).length > 0 ? customHeadersObj : null,
          request_timeout: requestTimeout ? parseFloat(requestTimeout) : null,
        },
      };

      const createdSource = await createToolkitSource(sourceData, projectId);

      if (onSuccess) {
        onSuccess(createdSource, tools);
      } else {
        // Navigate back to toolkits for this project on success (default behavior)
        navigate(`/projects/${projectId}/toolkits`);
      }
    } catch (error: any) {
      setCreateError(error.message || "Failed to create toolkit source");
      console.error("Failed to create toolkit source:", error);
    } finally {
      setIsCreating(false);
    }
  };


  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/projects/${projectId}/toolkits`);
    }
  };

  const content = (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="My MCP server"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="My MCP server with bunch of tools"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transport-type">Transport Type</Label>
          <Select
            value={transportType}
            onValueChange={(value) =>
              setTransportType(value as any)
            }
          >
            <SelectTrigger id="transport-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streamable-http">
                Streamable HTTP
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Server URL *</Label>
          <Input
            id="url"
            placeholder="http://localhost:9000/mcp"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="authentication">
            <Shield className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="headers">
            Custom Headers
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>
        <TabsContent value="authentication" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="auth-type">Authentication Type</Label>
            <Select
              value={authType}
              onValueChange={(value) => {
                setAuthType(value as "no_auth" | "bearer_token" | "oauth2");
                // Set default scope when OAuth2 is selected
                if (value === "oauth2" && !oauth2Scope) {
                  setOauth2Scope("");
                }
                // Reset custom credentials toggle when switching away from OAuth2
                if (value !== "oauth2") {
                  setUseCustomOAuthCredentials(false);
                }
              }}
            >
              <SelectTrigger id="auth-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_auth">No Authentication</SelectItem>
                <SelectItem value="bearer_token">Bearer Token</SelectItem>
                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType === "bearer_token" && (
            <div className="space-y-2">
              <Label htmlFor="bearer-token">Bearer Token *</Label>
              <Input
                id="bearer-token"
                type="password"
                placeholder="Enter bearer token"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                required={authType === "bearer_token"}
              />
            </div>
          )}

          {authType === "oauth2" && (
            <div className="space-y-4">
              {!useCustomOAuthCredentials && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Browser-based OAuth will automatically discover the authorization URL from the MCP server using the MCP protocol. A popup will open for authorization when connecting.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="oauth2-scope">OAuth Scopes</Label>
                <Input
                  id="oauth2-scope"
                  placeholder=""
                  value={oauth2Scope}
                  onChange={(e) => setOauth2Scope(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Default:  (space-separated for multiple scopes)
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-custom-oauth"
                  checked={useCustomOAuthCredentials}
                  onCheckedChange={(checked) => setUseCustomOAuthCredentials(checked === true)}
                />
                <Label htmlFor="use-custom-oauth" className="cursor-pointer">
                  Use custom credentials
                </Label>
              </div>

              {useCustomOAuthCredentials && (
                <div className="space-y-4 pl-6 border-l-2">
                  <div className="space-y-2">
                    <Label htmlFor="oauth2-client-id">Client ID *</Label>
                    <Input
                      id="oauth2-client-id"
                      placeholder="Enter OAuth2 client ID"
                      value={oauth2ClientId}
                      onChange={(e) => setOauth2ClientId(e.target.value)}
                      required={useCustomOAuthCredentials}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oauth2-client-secret">Client Secret *</Label>
                    <Input
                      id="oauth2-client-secret"
                      type="password"
                      placeholder="Enter OAuth2 client secret"
                      value={oauth2ClientSecret}
                      onChange={(e) => setOauth2ClientSecret(e.target.value)}
                      required={useCustomOAuthCredentials}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="headers" className="space-y-4 mt-4">
          <div className="space-y-3">
            {customHeaders.map((header, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`header-key-${index}`}>Header Name</Label>
                  <Input
                    id={`header-key-${index}`}
                    placeholder="X-Custom-Header"
                    value={header.key}
                    onChange={(e) => {
                      const newHeaders = [...customHeaders];
                      newHeaders[index].key = e.target.value;
                      setCustomHeaders(newHeaders);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`header-value-${index}`}>Value</Label>
                  <Input
                    id={`header-value-${index}`}
                    placeholder="Header value"
                    value={header.value}
                    onChange={(e) => {
                      const newHeaders = [...customHeaders];
                      newHeaders[index].value = e.target.value;
                      setCustomHeaders(newHeaders);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
                  }}
                  className="mb-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomHeaders([...customHeaders, { key: "", value: "" }]);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Header
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="configuration" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="request-timeout">Request Timeout (seconds)</Label>
            <Input
              id="request-timeout"
              type="number"
              min="1"
              step="0.1"
              placeholder="30"
              value={requestTimeout}
              onChange={(e) => setRequestTimeout(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Timeout for MCP server requests in seconds. Default: 30.0
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button
          className="w-full"
          onClick={handleMCPConnect}
          disabled={isCreating || !url.trim() || !name.trim()}
        >
          {isCreating ? (
            "Creating source..."
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {buttonText}
            </>
          )}
        </Button>
        {createError && (
          <p className="text-sm text-destructive mt-2">
            {createError}
          </p>
        )}
      </div>
    </>
  );

  if (inDialog) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="space-y-6">
      {showBackButton && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <Card>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMcpToolSource;

