import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, ChevronDown, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getWidget, getUiWidgetResource, downloadWidgetDeploymentArchive, setWidgetResource, type WidgetResponse } from "@/lib/api/widgets";
import { useWidgetChat } from "@/hooks/useWidgetChat";
import { MessageContent } from "@/components/MessageContent";
import { WidgetViewer } from "@/components/WidgetViewer";
import { TypingIndicator } from "@/components/TypingIndicator";
import { HTMLViewer } from "@/components/HTMLViewer";

const extractHTML = (resource: any): string | null => {
  if (!resource) return null;
  if (resource.mimeType === "text/html" && resource.text) {
    return resource.text;
  }
  if (resource.blob) {
    try {
      return atob(resource.blob);
    } catch {
      return resource.blob;
    }
  }
  return null;
};

const WidgetUxEdit = () => {
  const navigate = useNavigate();
  const { widgetId } = useParams<{ widgetId: string }>();
  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [originalUiResource, setOriginalUiResource] = useState<any | null>(null);
  const [temporaryUiResource, setTemporaryUiResource] = useState<any | null>(null);
  const [useTemporary, setUseTemporary] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Chat hook - only enable after widget is loaded
  const {
    messages: wsMessages,
    uiResourceId: chatUiResourceId,
    isConnected,
    isConnecting,
    error: chatError,
    sendMessage,
    reconnect,
  } = useWidgetChat({
    widgetId: widgetId || "",
    enabled: !!widgetId && !isLoading && !!widget,
  });

  useEffect(() => {
    const fetchWidget = async () => {
      if (!widgetId) return;

      try {
        setIsLoading(true);
        setError(null);
        const widgetData = await getWidget(widgetId);
        setWidget(widgetData);

        if (widgetData.ui_widget_resource_id) {
          try {
            const resourceData = await getUiWidgetResource(widgetData.ui_widget_resource_id);
            setOriginalUiResource({
              resource: resourceData.resource,
            });
          } catch (err: any) {
            console.error("Failed to fetch original UI resource:", err);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load widget");
        console.error("Failed to load widget:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWidget();
  }, [widgetId]);

  useEffect(() => {
    const fetchTemporaryResource = async () => {
      let latestResourceId: string | null = null;

      for (let i = wsMessages.length - 1; i >= 0; i--) {
        const message = wsMessages[i];
        if (message.role === "assistant" && message.ui_resource_id) {
          latestResourceId = message.ui_resource_id;
          break;
        }
      }

      if (!latestResourceId && chatUiResourceId) {
        latestResourceId = chatUiResourceId;
      }

      if (!latestResourceId && widget?.ui_widget_resource_id) {
        latestResourceId = widget.ui_widget_resource_id;
      }

      if (latestResourceId) {
        try {
          const resourceData = await getUiWidgetResource(latestResourceId);
          setTemporaryUiResource({
            resource: resourceData.resource,
          });

          const hasNoOriginal = !originalUiResource?.resource;
          const isDifferentFromOriginal = hasNoOriginal ||
            JSON.stringify(originalUiResource.resource) !== JSON.stringify(resourceData.resource);

          if (isDifferentFromOriginal) {
            setUseTemporary(true);
          }
          setIsWaitingForResponse(false);
        } catch (err: any) {
          console.error("Failed to fetch temporary UI resource:", err);
        }
      } else {
        setTemporaryUiResource(null);
        setUseTemporary(false);
      }
    };

    if (wsMessages.length > 0 || chatUiResourceId || widget?.ui_widget_resource_id) {
      fetchTemporaryResource();
    }
  }, [wsMessages, chatUiResourceId, widget?.ui_widget_resource_id, originalUiResource]);

  useEffect(() => {
    const lastMessage = wsMessages[wsMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      setIsWaitingForResponse(false);
    }
  }, [wsMessages]);

  useEffect(() => {
    if (!isConnected) {
      setIsWaitingForResponse(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || chatError) {
      setIsWaitingForResponse(false);
    }
  }, [isConnected, chatError]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (chatMessagesEndRef.current) {
        chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (chatScrollAreaRef.current) {
        const viewport = chatScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')!;
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [wsMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || !isConnected) return;

    sendMessage(chatInput);
    setChatInput("");
    setIsWaitingForResponse(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const currentUiResource = !originalUiResource?.resource
    ? temporaryUiResource
    : (useTemporary && temporaryUiResource) ? temporaryUiResource : originalUiResource;

  const currentUiResourceHtml = extractHTML(currentUiResource?.resource?.resource);

  const handleSave = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!widgetId || !widget) return;

    let resourceIdToSave: string | null = null;

    if (useTemporary && temporaryUiResource?.resource) {
      for (let i = wsMessages.length - 1; i >= 0; i--) {
        const message = wsMessages[i];
        if (message.role === "assistant" && message.ui_resource_id) {
          resourceIdToSave = message.ui_resource_id;
          break;
        }
      }
      if (!resourceIdToSave && chatUiResourceId) {
        resourceIdToSave = chatUiResourceId;
      }
    } else if (widget.ui_widget_resource_id) {
      resourceIdToSave = widget.ui_widget_resource_id;
    }

    if (!resourceIdToSave) {
      alert("No resource ID available to save");
      return;
    }

    setIsSaving(true);
    try {
      const updatedWidget = await setWidgetResource(widgetId, resourceIdToSave);
      setWidget(updatedWidget);
      if (updatedWidget.ui_widget_resource_id) {
        try {
          const resourceData = await getUiWidgetResource(updatedWidget.ui_widget_resource_id);
          setOriginalUiResource({
            resource: resourceData.resource,
          });
          setUseTemporary(false);
        } catch (err: any) {
          console.error("Failed to fetch updated UI resource:", err);
        }
      }
    } catch (error: any) {
      console.error("Failed to save widget resource:", error);
      alert(`Failed to save widget: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!widgetId || !widget) return;

    setIsDownloading(true);
    try {
      const { blob, filename } = await downloadWidgetDeploymentArchive(widgetId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `${widget.name ?? "pixie-widget"}-deployment.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Failed to download deployment bundle:", error);
      alert(`Failed to download widget bundle: ${error.message || "Unknown error"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading widget...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Widget not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !widget}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button onClick={handleDeploy} disabled={isDownloading || !widget}>
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-4 min-h-0">
          <Card className="flex-shrink-0">
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{widget.name}</CardTitle>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">ID:</span>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {widget.id}
                      </span>
                    </div>
                  </div>

                  {widget.description && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Description:</span>
                      <p className="text-sm text-foreground">{widget.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p>{formatDate(widget.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <p>{formatDate(widget.updated_at)}</p>
                    </div>
                    {widget.ui_widget_resource_id && (
                      <div>
                        <span className="text-muted-foreground">UI Resource ID:</span>
                        <p className="font-mono text-xs">{widget.ui_widget_resource_id}</p>
                      </div>
                    )}
                  </div>

                  {widget.tool_ids && widget.tool_ids.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Associated Tools:</span>
                      <div className="flex flex-wrap gap-2">
                        {widget.tool_ids.map((toolId) => (
                          <Badge key={toolId} variant="secondary" className="text-xs">
                            {toolId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chat Assistant</CardTitle>
                  <CardDescription>Suggest changes to improve the widget's UX</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isConnecting && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Badge
                    variant={isConnected ? "success" : isConnecting ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 gap-3">
              {chatError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md flex items-center justify-between">
                  <span>{chatError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reconnect}
                    className="h-6 px-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
              <ScrollArea ref={chatScrollAreaRef} className="flex-1 pr-4">
                <div className="space-y-4">
                  {wsMessages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {isConnecting ? (
                        <p>Connecting to chat...</p>
                      ) : (
                        <p>Start a conversation to suggest UX improvements</p>
                      )}
                    </div>
                  )}
                  {wsMessages.map((message, index) => (
                    <div
                      key={message.message_id || index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "system"
                            ? "bg-muted/50 text-muted-foreground italic"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        <MessageContent
                          content={message.content}
                          contentFormat={message.content_format}
                          className={
                            message.role === "user"
                              ? "text-primary-foreground"
                              : message.role === "system"
                                ? "text-muted-foreground italic"
                                : "text-muted-foreground"
                          }
                        />
                      </div>
                    </div>
                  ))}
                  {isWaitingForResponse && isConnected && (
                    <TypingIndicator />
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  placeholder={isConnected ? "Type your suggestion..." : "Connecting..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && isConnected) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  className="resize-none"
                  disabled={!isConnected}
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="shrink-0"
                  disabled={!isConnected || !chatInput.trim()}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{showCode ? "Code" : "Preview"}</CardTitle>
                  <CardDescription>
                    {showCode ? "HTML source code" : "Live preview of the widget interface"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="code-preview-toggle" className="text-sm font-normal cursor-pointer">
                      {showCode ? "Code" : "Preview"}
                    </Label>
                    <Switch
                      id="code-preview-toggle"
                      checked={showCode}
                      onCheckedChange={setShowCode}
                    />
                  </div>
                  {temporaryUiResource?.resource && originalUiResource?.resource ? (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ui-resource-toggle" className="text-sm font-normal cursor-pointer">
                        {useTemporary ? "Temporary" : "Original"}
                      </Label>
                      <Switch
                        id="ui-resource-toggle"
                        checked={useTemporary}
                        onCheckedChange={setUseTemporary}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              <div className="flex-1 border rounded-lg overflow-hidden bg-background m-6">
                {currentUiResourceHtml ? (
                  showCode ? (
                    <ScrollArea className="h-full">
                      <HTMLViewer html={currentUiResourceHtml} />
                    </ScrollArea>
                  ) : (
                    <WidgetViewer
                      uiResource={currentUiResource?.resource}
                      widgetId={widgetId ?? ""}
                      key={useTemporary ? "temporary" : "original"}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No preview available. Start a chat conversation to generate UI.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WidgetUxEdit;
