import { isUIResource } from '@mcp-ui/client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PixieRenderer } from '../renderer/renderer';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getWidget, type WidgetResponse } from '@/lib/api/widgets';
import { 
  getToolDetail, 
  getToolkit, 
  getToolkitSource, 
  type ToolDetailResponse, 
  type ToolkitDetail, 
  type ToolkitSourceDetail 
} from '@/lib/api/tools';
import { useConnection } from '@/lib/mcp/hooks/useConnection';
import { DEFAULT_INSPECTOR_CONFIG } from '@/lib/mcp/constants';
import type { InspectorConfig } from '@/lib/mcp/configurationTypes';
import type { CustomHeaders } from '@/lib/mcp/types/customHeaders';
import { recordToHeaders } from '@/lib/mcp/types/customHeaders';
import { waitForOAuthToken } from '@/lib/mcp/utils/oauthUtils';

interface UIResource {
  type?: 'resource';
  resource?: {
    uri?: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

interface WidgetViewerProps {
  uiResource: UIResource | null;
  widgetId: string;
  projectId: string;
  className?: string;
}

export const WidgetViewer: React.FC<WidgetViewerProps> = ({
  uiResource,
  widgetId,
  projectId,
  className = "w-full h-full border-0"
}) => {
  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [toolDetail, setToolDetail] = useState<ToolDetailResponse | null>(null);
  const [toolkit, setToolkit] = useState<ToolkitDetail | null>(null);
  const [source, setSource] = useState<ToolkitSourceDetail | null>(null);
  const [isLoadingWidget, setIsLoadingWidget] = useState(true);
  const [connectionConfig, setConnectionConfig] = useState<{
    url: string;
    transportType: "streamable-http";
    customHeaders: CustomHeaders;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthScope?: string;
    config: InspectorConfig;
  } | null>(null);
  const hasAttemptedConnectionRef = useRef(false);
  const isUnmountingRef = useRef(false);
  const waitingForOAuthTokenRef = useRef(false);

  useEffect(() => {
    const loadWidgetData = async () => {
      try {
        setIsLoadingWidget(true);
        const widgetData = await getWidget(widgetId, projectId);
        setWidget(widgetData);
        
        if (widgetData.tool_ids && widgetData.tool_ids.length > 0) {
          const tool = await getToolDetail(widgetData.tool_ids[0], projectId);
          setToolDetail(tool);
          
          // Get the toolkit
          if (tool.toolkit_id) {
            const toolkitData = await getToolkit(tool.toolkit_id, projectId);
            setToolkit(toolkitData);
            
            // Get the source from toolkit (it's included in the response)
            if (toolkitData.toolkit_source) {
              setSource(toolkitData.toolkit_source);
            } else if (toolkitData.toolkit_source_id) {
              // Fallback: fetch source if not included
              const sourceData = await getToolkitSource(toolkitData.toolkit_source_id, projectId);
              setSource(sourceData);
            }
          }
        }
      } catch (error) {
        console.error('[WidgetViewer] Failed to load widget data:', error);
      } finally {
        setIsLoadingWidget(false);
      }
    };
    
    loadWidgetData();
  }, [widgetId, projectId]);

  const connectionConfigMemo = useMemo(() => {
    if (!source) return null;

    const config: InspectorConfig = { ...DEFAULT_INSPECTOR_CONFIG };
    if (source.configuration.request_timeout) {
      config.MCP_SERVER_REQUEST_TIMEOUT = {
        ...config.MCP_SERVER_REQUEST_TIMEOUT,
        value: source.configuration.request_timeout * 1000, // Convert seconds to milliseconds
      };
    }

    // Build custom headers
    const customHeadersObj: Record<string, string> = source.configuration.custom_headers || {};
    const customHeaders: CustomHeaders = recordToHeaders(customHeadersObj);

    // Prepare OAuth credentials
    const authConfig = source.configuration.auth_config;
    const oauthClientId = authConfig?.type === "oauth2" && authConfig.oauth2_client_id 
      ? authConfig.oauth2_client_id 
      : undefined;
    const oauthClientSecret = authConfig?.type === "oauth2" && authConfig.oauth2_client_secret 
      ? authConfig.oauth2_client_secret 
      : undefined;
    const oauthScope = authConfig?.type === "oauth2" && authConfig.oauth2_scope 
      ? authConfig.oauth2_scope.join(" ")
      : undefined;

    return {
      url: source.configuration.server_url || "",
      transportType: (source.configuration.transport as "streamable-http") || "streamable-http",
      customHeaders,
      oauthClientId,
      oauthClientSecret,
      oauthScope,
      config,
    };
  }, [
    source?.configuration.server_url,
    source?.configuration.transport,
    source?.configuration.request_timeout,
    source?.configuration.custom_headers,
    source?.configuration.auth_config?.type,
    source?.configuration.auth_config?.oauth2_client_id,
    source?.configuration.auth_config?.oauth2_client_secret,
    source?.configuration.auth_config?.oauth2_scope,
  ]);

  useEffect(() => {
    setConnectionConfig(connectionConfigMemo);
  }, [connectionConfigMemo]);

  const {
    connect,
    disconnect,
    connectionStatus,
    mcpClient,
    oauthTriggered
  } = useConnection({
    transportType: connectionConfig?.transportType || "streamable-http",
    command: "",
    args: "",
    sseUrl: connectionConfig?.url || "",
    env: {},
    customHeaders: connectionConfig?.customHeaders,
    oauthClientId: connectionConfig?.oauthClientId,
    oauthClientSecret: connectionConfig?.oauthClientSecret,
    oauthScope: connectionConfig?.oauthScope,
    config: connectionConfig?.config || DEFAULT_INSPECTOR_CONFIG,
    connectionType: "direct",
  });

  useEffect(() => {
    hasAttemptedConnectionRef.current = false;
  }, [connectionConfig?.url]);

  useEffect(() => {
    if (
      connectionConfig && 
      connectionStatus === "disconnected" && 
      !hasAttemptedConnectionRef.current &&
      !isUnmountingRef.current
    ) {
      hasAttemptedConnectionRef.current = true;
      connect();
    }
  }, [connectionConfig, connect, connectionStatus]);

  useEffect(() => {
    if (oauthTriggered && !waitingForOAuthTokenRef.current && connectionConfig?.url) {
      waitingForOAuthTokenRef.current = true;
      const timeoutValue = connectionConfig.config.MCP_SERVER_REQUEST_TIMEOUT?.value;
      const maxWaitTime: number = typeof timeoutValue === 'number' ? timeoutValue : 30000;
      
      waitForOAuthToken(connectionConfig.url, maxWaitTime)
        .then(() => {
          waitingForOAuthTokenRef.current = false;
          setTimeout(() => {
            hasAttemptedConnectionRef.current = false;
            connect();
          }, 500);
        })
        .catch((error) => {
          waitingForOAuthTokenRef.current = false;
          console.error('[WidgetViewer] OAuth token wait failed:', error);
          hasAttemptedConnectionRef.current = false;
        });
    }
  }, [oauthTriggered, connectionConfig, connect]);

  useEffect(() => {
    isUnmountingRef.current = false;
    return () => {
      isUnmountingRef.current = true;
      if (connectionStatus !== "disconnected") {
        disconnect(/**clearAuthProvider: */ false);
      }
    };
  }, []);

  if (!isUIResource(uiResource as any)) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Unsupported resource</p></div>;
  }

  const widgetHasTools = widget && widget.tool_ids && widget.tool_ids.length > 0;
  const isConnectionReady = !widgetHasTools || (connectionStatus === "connected" && mcpClient !== null);
  const isConnecting = widgetHasTools && connectionConfig && (
    connectionStatus === "disconnected" || 
    (hasAttemptedConnectionRef.current && connectionStatus !== "connected" && connectionStatus !== "error" && connectionStatus !== "error-connecting-to-proxy")
  );
  const hasConnectionError = connectionStatus === "error" || connectionStatus === "error-connecting-to-proxy";

  if (isLoadingWidget || (widgetHasTools && !connectionConfig)) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading widget configuration...</p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to MCP server...</p>
        </div>
      </div>
    );
  }

  // Show error state if connection failed
  if (hasConnectionError && connectionConfig) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Alert className="max-w-md mx-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Failed to connect to MCP server</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                hasAttemptedConnectionRef.current = false;
                connect();
              }}
              className="flex items-center gap-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Only render iframe when connection is ready
  if (!isConnectionReady) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Waiting for MCP connection...</p>
        </div>
      </div>
    );
  }

  const mcpToolCallable = async (toolName: string, toolParams: Record<string, unknown>) => {
    if (!mcpClient || connectionStatus !== "connected") {
      connect();
      while (connectionStatus !== "connected") {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return await mcpClient.callTool({
      name: toolName,
      arguments: toolParams,
    });
  };

  return (
    <PixieRenderer
      resource={uiResource?.resource ?? {}}
      mcpToolCallable={mcpToolCallable}
      htmlProps={{
        sandboxPermissions: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms',
        iframeProps: {
          allow: 'microphone; camera; geolocation; fullscreen; payment; usb; serial; bluetooth; autoplay; encrypted-media; picture-in-picture',
        } as React.HTMLAttributes<HTMLIFrameElement>,
      }}
    />
  );
};

