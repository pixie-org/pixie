import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getToolkit, listToolkitTools, getToolDetail, deleteToolDetail, enableTool, disableTool, deleteToolkit, getToolkitSource, type ToolkitDetail, ToolDetailResponse, type ToolkitSourceDetail } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";
import type { Tool } from "@/components/ToolsList";

const ToolkitDetail = () => {
  const { toolkitId, projectId: urlProjectId } = useParams<{ toolkitId: string; projectId: string }>();
  const navigate = useNavigate();
  const { getCurrentProjectId } = useProject();
  const [toolkit, setToolkit] = useState<ToolkitDetail | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTools, setIsLoadingTools] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [toolDetails, setToolDetails] = useState<ToolDetailResponse | null>(null);
  const [isLoadingToolDetails, setIsLoadingToolDetails] = useState(false);
  const [toolDetailsError, setToolDetailsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteToolkitConfirm, setShowDeleteToolkitConfirm] = useState(false);
  const [isDeletingToolkit, setIsDeletingToolkit] = useState(false);
  const [deleteToolkitError, setDeleteToolkitError] = useState<string | null>(null);
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [sourceDetails, setSourceDetails] = useState<ToolkitSourceDetail | null>(null);
  const [isLoadingSourceDetails, setIsLoadingSourceDetails] = useState(false);
  const [sourceDetailsError, setSourceDetailsError] = useState<string | null>(null);
  const projectId = urlProjectId as string;

  useEffect(() => {
    const fetchToolkit = async () => {
      if (!toolkitId) return;

      try {
        setIsLoading(true);
        setError(null);
        const toolkitData = await getToolkit(toolkitId, projectId);
        setToolkit(toolkitData);
      } catch (err: any) {
        setError(err.message || "Failed to load toolkit");
        console.error("Failed to load toolkit:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToolkit();
  }, [toolkitId, urlProjectId]);

  useEffect(() => {
    const fetchTools = async () => {
      if (!toolkitId) return;

      try {
        setIsLoadingTools(true);
        setToolsError(null);
        const toolsData = await listToolkitTools(toolkitId, projectId);
        setTools(toolsData);
      } catch (err: any) {
        setToolsError(err.message || "Failed to load tools");
        console.error("Failed to load toolkit tools:", err);
      } finally {
        setIsLoadingTools(false);
      }
    };

    if (toolkitId) {
      fetchTools();
    }
  }, [toolkitId, urlProjectId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}/toolkits`);
  };

  const handleToolClick = (toolId: string) => {
    setSelectedToolId(toolId);
    setIsToolDialogOpen(true);
    setToolDetailsError(null);
    setToolDetails(null);
  };

  useEffect(() => {
    const fetchToolDetails = async () => {
      if (!selectedToolId || !isToolDialogOpen) return;

      setIsLoadingToolDetails(true);
      setToolDetailsError(null);

      try {
        const details = await getToolDetail(selectedToolId, projectId);
        setToolDetails(details);
      } catch (err: any) {
        setToolDetailsError(err.message || "Failed to load tool details");
        console.error("Failed to load tool details:", err);
      } finally {
        setIsLoadingToolDetails(false);
      }
    };

    fetchToolDetails();
  }, [selectedToolId, isToolDialogOpen, urlProjectId]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedToolId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteToolDetail(selectedToolId, projectId);

      if (toolkitId) {
        const toolsData = await listToolkitTools(toolkitId, projectId);
        setTools(toolsData);
      }

      setShowDeleteConfirm(false);
      setIsToolDialogOpen(false);
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete tool");
      console.error("Failed to delete tool:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const handleToggleEnabled = async () => {
    if (!selectedToolId || !toolDetails) return;

    setIsToggling(true);
    setToggleError(null);

    try {
      if (toolDetails.is_enabled) {
        await disableTool(selectedToolId, projectId);
      } else {
        await enableTool(selectedToolId, projectId);
      }

      const updatedDetails = await getToolDetail(selectedToolId, projectId);
      setToolDetails(updatedDetails);
    } catch (error: any) {
      setToggleError(error.message || "Failed to toggle tool status");
      console.error("Failed to toggle tool:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatJSON = (obj: any) => {
    if (!obj) return "N/A";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const handleDeleteToolkitClick = () => {
    setShowDeleteToolkitConfirm(true);
  };

  const handleConfirmDeleteToolkit = async () => {
    if (!toolkitId) return;

    setIsDeletingToolkit(true);
    setDeleteToolkitError(null);

    try {
      const projectId = urlProjectId || getCurrentProjectId();
      await deleteToolkit(toolkitId, projectId);

      // Navigate back to toolkits list
      navigate(`/projects/${projectId}/toolkits`);
    } catch (error: any) {
      setDeleteToolkitError(error.message || "Failed to delete toolkit");
      console.error("Failed to delete toolkit:", error);
    } finally {
      setIsDeletingToolkit(false);
    }
  };

  const handleCancelDeleteToolkit = () => {
    setShowDeleteToolkitConfirm(false);
    setDeleteToolkitError(null);
  };

  const handleSourceClick = () => {
    if (!toolkit?.toolkit_source?.id) return;
    setIsSourceDialogOpen(true);
    setSourceDetailsError(null);
    setSourceDetails(null);
  };

  useEffect(() => {
    const fetchSourceDetails = async () => {
      if (!toolkit?.toolkit_source?.id || !isSourceDialogOpen) return;

      setIsLoadingSourceDetails(true);
      setSourceDetailsError(null);

      try {
        const details = await getToolkitSource(toolkit.toolkit_source.id, projectId);
        setSourceDetails(details);
      } catch (err: any) {
        setSourceDetailsError(err.message || "Failed to load source details");
        console.error("Failed to load source details:", err);
      } finally {
        setIsLoadingSourceDetails(false);
      }
    };

    fetchSourceDetails();
  }, [toolkit?.toolkit_source?.id, isSourceDialogOpen, urlProjectId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading toolkit...</p>
        </div>
      </div>
    );
  }

  if (error || !toolkit) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-destructive">Error: {error || "Toolkit not found"}</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Toolkits
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{toolkit.name}</h1>
        </div>
        <Button
          variant="destructive"
          onClick={handleDeleteToolkitClick}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Toolkit
        </Button>
      </div>

      {/* Toolkit Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">ID:</span>
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {toolkit.id}
              </span>
            </div>
            {toolkit.toolkit_source && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Source:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSourceClick}
                  className="h-7 text-xs font-semibold"
                >
                  {toolkit.toolkit_source.source_type
                    ? toolkit.toolkit_source.source_type === "mcp_server"
                      ? "MCP Server"
                      : toolkit.toolkit_source.source_type === "openapi_specification"
                        ? "OpenAPI Specification"
                        : toolkit.toolkit_source.source_type.toUpperCase()
                    : "Unknown"}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {toolkit.toolkit_source.id}
                  </span>
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Created:</span>
              <span>{formatDate(toolkit.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Updated:</span>
              <span>{formatDate(toolkit.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Section */}
      <Card>
        <CardHeader>
          <CardDescription>
            {isLoadingTools
              ? "Loading tools..."
              : toolsError
                ? `Error: ${toolsError}`
                : `Showing ${tools.length} ${tools.length !== 1 ? 'tools' : 'tool'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {toolsError && (
            <div className="text-center py-8">
              <p className="text-destructive">{toolsError}</p>
            </div>
          )}
          {!isLoadingTools && !toolsError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool) => (
                <Card
                  key={tool.id}
                  className="group cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-0 overflow-hidden"
                  onClick={() => handleToolClick(tool.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors truncate">
                          {tool.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                      {tool.description || "No description available"}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {tools.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No tools found in this toolkit.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tool Detail Dialog */}
      <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tool Details</DialogTitle>
            <DialogDescription>
              View detailed information about this tool
            </DialogDescription>
          </DialogHeader>

          {isLoadingToolDetails && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading tool details...</p>
            </div>
          )}

          {toolDetailsError && (
            <div className="py-4">
              <p className="text-destructive">{toolDetailsError}</p>
            </div>
          )}

          {toolDetails && !isLoadingToolDetails && (
            <div className="space-y-6 py-4">
              {/* Name and ID Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{toolDetails.title || toolDetails.name}</h3>
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                    {toolDetails.id}
                  </span>
                  <Badge variant={toolDetails.is_enabled ? "success" : "secondary"} className="text-xs">
                    {toolDetails.is_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {toolDetails.description || "No description available"}
                </p>
              </div>

              {/* Name */}
              {toolDetails.title && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{toolDetails.name}</p>
                </div>
              )}

              {/* Schemas and Annotations in Accordion */}
              {(toolDetails.inputSchema || toolDetails.outputSchema || toolDetails.annotations) && (
                <Accordion type="single" collapsible className="w-full">
                  {toolDetails.inputSchema && (
                    <AccordionItem value="input-schema">
                      <AccordionTrigger className="text-sm font-medium">
                        Input Schema
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 shadow-sm">
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-foreground">
                            {formatJSON(toolDetails.inputSchema)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {toolDetails.outputSchema && (
                    <AccordionItem value="output-schema">
                      <AccordionTrigger className="text-sm font-medium">
                        Output Schema
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 shadow-sm">
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-foreground">
                            {formatJSON(toolDetails.outputSchema)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {toolDetails.annotations && (
                    <AccordionItem value="annotations">
                      <AccordionTrigger className="text-sm font-medium">
                        Annotations
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 shadow-sm">
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-foreground">
                            {formatJSON(toolDetails.annotations)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2 border-t">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Created</span>
                  <span>{formatDate(toolDetails.created_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Last Updated</span>
                  <span>{formatDate(toolDetails.updated_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Toolkit ID</span>
                  <span className="font-mono text-xs">{toolDetails.toolkit_id}</span>
                </div>
              </div>

              {toggleError && (
                <p className="text-sm text-destructive">{toggleError}</p>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="tool-enabled" className="text-sm font-medium">
                  Enabled
                </Label>
                <Switch
                  id="tool-enabled"
                  checked={toolDetails?.is_enabled || false}
                  onCheckedChange={handleToggleEnabled}
                  disabled={isToggling || !toolDetails}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isDeleting || !toolDetails}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <Button variant="outline" onClick={() => setIsToolDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{toolDetails?.title || toolDetails?.name}"? This action cannot be undone. The tool will be permanently removed from the toolkit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive mt-2">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Source Details Dialog */}
      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toolkit Source Details</DialogTitle>
            <DialogDescription>
              View detailed information about the toolkit source
            </DialogDescription>
          </DialogHeader>

          {isLoadingSourceDetails && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          )}

          {sourceDetailsError && (
            <div className="py-4">
              <p className="text-destructive">{sourceDetailsError}</p>
            </div>
          )}

          {sourceDetails && !isLoadingSourceDetails && (
            <div className="space-y-6 py-4">
              {/* Name and ID Section */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{sourceDetails.name}</h3>
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                    {sourceDetails.id}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {sourceDetails.source_type.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {sourceDetails.description ? String(sourceDetails.description) : "No description available"}
                </p>
              </div>

              {Boolean(
                sourceDetails.configuration.server_url ||
                sourceDetails.configuration.transport ||
                sourceDetails.configuration.auth_config !== undefined ||
                (sourceDetails.configuration as any).openapi_spec
              ) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Configuration</Label>
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      {sourceDetails.configuration.server_url && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Server URL</span>
                          <span className="text-sm font-mono break-all">{sourceDetails.configuration.server_url}</span>
                        </div>
                      )}
                      {sourceDetails.configuration.transport && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Transport</span>
                          <span className="text-sm">{sourceDetails.configuration.transport}</span>
                        </div>
                      )}
                      {sourceDetails.configuration.auth_config && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Authentication</span>
                          <span className="text-sm text-muted-foreground">
                            {sourceDetails.configuration.auth_config.type === "no_auth" 
                              ? "No Authentication" 
                              : sourceDetails.configuration.auth_config.type === "bearer_token"
                              ? "Bearer Token (configured)"
                              : sourceDetails.configuration.auth_config.type}
                          </span>
                        </div>
                      )}
                      {(sourceDetails.configuration.openapi_spec as any) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">OpenAPI Specification</span>
                          <div className="rounded-lg bg-background border p-3 mt-1">
                            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-foreground max-h-60 overflow-y-auto">
                              {typeof (sourceDetails.configuration.openapi_spec as any) === 'string'
                                ? (sourceDetails.configuration.openapi_spec as string)
                                : formatJSON(sourceDetails.configuration.openapi_spec)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2 border-t">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Created</span>
                  <span>{formatDate(sourceDetails.created_at)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Last Updated</span>
                  <span>{formatDate(sourceDetails.updated_at)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSourceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Toolkit Confirmation Dialog */}
      <AlertDialog open={showDeleteToolkitConfirm} onOpenChange={setShowDeleteToolkitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Toolkit?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{toolkit?.name}"? This action cannot be undone. The toolkit and all its tools will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteToolkitError && (
            <p className="text-sm text-destructive mt-2">{deleteToolkitError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteToolkit} disabled={isDeletingToolkit}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteToolkit}
              disabled={isDeletingToolkit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingToolkit ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ToolkitDetail;
