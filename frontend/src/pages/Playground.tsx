import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { MessageContent } from "@/components/MessageContent";
import { useMcpChat, McpServerConfig } from "@/hooks/useMcpChat";
import { Send, Plus, Bot, User, Loader2, AlertCircle, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixieRenderer } from "../renderer/renderer";

const extractUIResource = (
  response: any,
): any[] => {
  const resources: any[] = [];
  if (!response) return resources;
  const payload = response // JSON.parse(response);
  // If payload is an array, try the first element
  const actualPayload = Array.isArray(payload)
    ? payload[0]
    : payload;
  if (!actualPayload) return resources;
  // Check for nested output.value structure (chat tab structure)
  const nestedValue = actualPayload?.output?.value;
  if (nestedValue && typeof nestedValue === "object") {
    // Check output.value.content array
    const nestedContent = nestedValue.content;
    if (Array.isArray(nestedContent)) {
      for (const item of nestedContent) {
        if (
          item?.type === "resource" &&
          item?.resource?.uri &&
          typeof item.resource.uri === "string" &&
          item.resource.uri.startsWith("ui://")
        ) {
          resources.push(item.resource);
        }
      }
    }
    // Check output.value.structuredContent.result array
    const structuredResult =
      nestedValue.structuredContent?.result;
    if (Array.isArray(structuredResult)) {
      for (const item of structuredResult) {
        if (
          item?.type === "resource" &&
          item?.resource?.uri &&
          typeof item.resource.uri === "string" &&
          item.resource.uri.startsWith("ui://")
        ) {
          resources.push(item.resource);
        }
      }
    }
  }
  // Fallback: Check for direct resource at root level
  const direct = actualPayload?.resource;
  if (
    direct &&
    typeof direct === "object" &&
    typeof direct.uri === "string" &&
    direct.uri.startsWith("ui://")
  ) {
    resources.push(direct);
  }
  // Fallback: Check content array at root level. Left this for backwards compatibility.
  const content = actualPayload?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (
        item?.type === "resource" &&
        item?.resource?.uri &&
        typeof item.resource.uri === "string" &&
        item.resource.uri.startsWith("ui://")
      ) {
        resources.push(item.resource);
      }
    }
  }
  return resources;
};

const ensureUIResourceMetadata = (uiResource: any): any => {
  uiResource._meta = uiResource._meta || {};
  if (!uiResource._meta['mcpui.dev/ui-preferred-frame-size']) {
    uiResource._meta['mcpui.dev/ui-preferred-frame-size'] = ['500px', '300px'];
  }
  return uiResource;
};

const Playground = () => {
  const [mcpServerConfig, setMcpServerConfig] = useState<McpServerConfig | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [credentials, setCredentials] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showToolsDialog, setShowToolsDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    isConnected,
    isInitialized,
    tools,
    messages,
    error,
    isLoading,
    sendMessage,
    initialize,
    disconnect,
  } = useMcpChat({
    mcpServer: mcpServerConfig,
    enabled: !!mcpServerConfig,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      return;
    }

    try {
      let parsedCredentials: Record<string, string> | undefined;
      if (credentials.trim()) {
        parsedCredentials = JSON.parse(credentials);
      }

      const config: McpServerConfig = {
        server_url: serverUrl.trim(),
        transport: "streamable-http",
        credentials: parsedCredentials,
      };

      setMcpServerConfig(config);
      setShowConfigDialog(false);
    } catch (err) {
      console.error("Failed to parse credentials:", err);
      alert("Invalid credentials JSON format");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setMcpServerConfig(null);
    setServerUrl("");
    setCredentials("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !isInitialized) return;

    try {
      await sendMessage(inputValue.trim());
      setInputValue("");
      inputRef.current?.focus();
    } catch (err: any) {
      console.error("Error sending message:", err);
      // Error is already set by the hook, but we can show a toast or alert if needed
      // The error will be displayed in the error card
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex flex-col h-full w-full -mx-4 lg:-mx-6">
      {/* Top Bar with Add Server Button and Tool Count */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {!isConnected && (
            <Button onClick={() => setShowConfigDialog(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          )}
          {isInitialized && tools.length > 0 && (
            <Badge
              variant="secondary"
              className="text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => setShowToolsDialog(true)}
            >
              {tools.length} {tools.length === 1 ? "tool" : "tools"} available
            </Badge>
          )}
          {isConnected && (
            <Badge variant={isInitialized ? "default" : "secondary"}>
              {isInitialized ? "Connected" : "Connecting..."}
            </Badge>
          )}
        </div>
        {/* {isConnected && (
          <Button onClick={handleDisconnect} variant="ghost" size="sm">
            Disconnect
          </Button>
        )} */}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-2 border-destructive flex-shrink-0 mx-4 lg:mx-6">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages Area */}
      <Card className="flex-1 flex flex-col min-h-0 mb-2 overflow-hidden ml-4 lg:ml-6 mr-0">
        {!isInitialized && (
          <CardHeader className="pb-3 flex-shrink-0 pl-4 lg:pl-6 pr-0 pt-4">
            <CardDescription>
              {isConnected
                ? "Initializing connection..."
                : "Click 'Add Server' to connect to an MCP server and start chatting"}
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          <ScrollArea className="flex-1 pl-4 lg:pl-6 pr-0">
            <div className="space-y-4 py-4">
              {messages.length === 0 && isInitialized && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation by sending a message below</p>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg p-4 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "user" ? (
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    ) : (
                      <div>
                        <MessageContent
                          content={message.content}
                          contentFormat={message.content_format}
                        />
                        {(() => {
                          const uiResources = extractUIResource(message.tool_calls?.[0]?.result);
                          if (uiResources.length > 0) {
                            const resourcesWithMetadata = uiResources.map(ensureUIResourceMetadata);
                            if (resourcesWithMetadata.length === 1) {
                              // Single resource - render as before
                              return (
                                <div className="pt-2 pb-2">
                                  <PixieRenderer resource={resourcesWithMetadata[0]} />
                                </div>
                              );
                            } else {
                              // Multiple resources - render in grid
                              return (
                                <div className="pt-2 pb-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {resourcesWithMetadata.map((resource, idx) => (
                                      <div key={idx}>
                                        <PixieRenderer resource={resource} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                        {/* Tool Calls Display */}
                        {message.tool_calls && message.tool_calls.length > 0 && (
                          <div className="mt-4 space-y-2 border-t pt-4">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                              Tool Calls ({message.tool_calls.length})
                            </div>
                            {message.tool_calls.map((toolCall, idx) => (
                              <Collapsible key={idx} className="border rounded-md">
                                <CollapsibleTrigger className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                                  <div className="flex items-center gap-2">
                                    {toolCall.error ? (
                                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                                    )}
                                    <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                                      {toolCall.tool_name}
                                    </code>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 space-y-3">
                                    {/* Arguments */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                                        Arguments:
                                      </div>
                                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                        {JSON.stringify(toolCall.arguments, null, 2)}
                                      </pre>
                                    </div>
                                    {/* Result or Error */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                                        {toolCall.error ? "Error:" : "Result:"}
                                      </div>
                                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                        {toolCall.error
                                          ? toolCall.error
                                          : JSON.stringify(toolCall.result, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-lg p-4 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card className="flex-shrink-0 ml-4 lg:ml-6 mr-0 mb-4">
        <CardContent className="pt-3 pb-3 pl-4 lg:pl-6 pr-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isInitialized
                  ? "Type your message..."
                  : "Connect to an MCP server to start chatting"
              }
              disabled={!isInitialized || isLoading}
              rows={1}
              className="resize-none min-h-[60px] max-h-[200px]"
              style={{
                height: "auto",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || !isInitialized || isLoading}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0 mr-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Server Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Configure your MCP server connection to start chatting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-server-url">MCP Server URL</Label>
              <Input
                id="dialog-server-url"
                placeholder="https://example.com/mcp"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-credentials">Credentials (JSON, optional)</Label>
              <Textarea
                id="dialog-credentials"
                placeholder='{"Authorization": "Bearer token123"}'
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                disabled={isConnected}
                rows={3}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfigDialog(false);
                  setServerUrl("");
                  setCredentials("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={!serverUrl.trim() || isConnected}>
                {isConnected ? "Connected" : "Connect"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tools Details Dialog */}
      <Dialog open={showToolsDialog} onOpenChange={setShowToolsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Available Tools ({tools.length})</DialogTitle>
            <DialogDescription>
              Details of all available tools from the MCP server
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {tools.map((tool, index) => (
                <Card key={tool.name || index} className="border">
                  <CardHeader>
                    <CardTitle className="text-base">{tool.title || tool.name}</CardTitle>
                    {tool.description && (
                      <CardDescription>{tool.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        Tool Name:
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {tool.name}
                      </code>
                    </div>
                    {tool.inputSchema && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2">
                          Input Schema:
                        </div>
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Boolean(tool.inputSchema?.properties) && (
                      <>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-2">
                            Parameters:
                          </div>
                          <div className="space-y-2">
                            {Object.entries(tool.inputSchema.properties as Record<string, any>).map(([key, value]: [string, any]) => (
                              <div key={key} className="border-l-2 border-primary/20 pl-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-xs font-semibold">{key}</code>
                                  {(tool.inputSchema.required as string[] | undefined)?.includes(key) && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      Required
                                    </Badge>
                                  )}
                                  {value.type && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      {value.type}
                                    </Badge>
                                  )}
                                </div>
                                {value.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {value.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playground;
