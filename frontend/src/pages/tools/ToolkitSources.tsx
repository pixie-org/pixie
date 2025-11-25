import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Plus, ChevronDown, Trash2 } from "lucide-react";
import { listToolkitSources, getToolkitSource, deleteToolkitSource, type ToolkitSource, type ToolkitSourceDetail } from "@/lib/api/tools";
import { DEFAULT_PROJECT_ID } from "@/lib/api/client";

const ToolSources = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState<ToolkitSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceDetails, setSourceDetails] = useState<ToolkitSourceDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sourcesData = await listToolkitSources(DEFAULT_PROJECT_ID);
      setSources(sourcesData);
    } catch (err: any) {
      setError(err.message || "Failed to load toolkit sources");
      console.error("Failed to load toolkit sources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleCreateSource = (type: "mcp" | "api") => {
    navigate(`/create-tool-source?type=${type}`);
  };

  const handleCardClick = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setIsDialogOpen(true);
    setDetailsError(null);
    setSourceDetails(null);
  };

  const handleDeleteClick = () => {
    if (selectedSourceId) {
      setDeleteSourceId(selectedSourceId);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteSourceId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteToolkitSource(deleteSourceId);
      setIsDialogOpen(false);
      await fetchSources();
      setDeleteSourceId(null);
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete toolkit source");
      console.error("Failed to delete toolkit source:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteSourceId(null);
    setDeleteError(null);
  };

  useEffect(() => {
    const fetchSourceDetails = async () => {
      if (!selectedSourceId || !isDialogOpen) return;

      setIsLoadingDetails(true);
      setDetailsError(null);

      try {
        const details = await getToolkitSource(selectedSourceId);
        setSourceDetails(details);
      } catch (err: any) {
        setDetailsError(err.message || "Failed to load source details");
        console.error("Failed to load source details:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchSourceDetails();
  }, [selectedSourceId, isDialogOpen]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading toolkit sources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Create
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreateSource("mcp")}>
              MCP Server
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateSource("api")}>
              OpenAPI specification
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Showing {sources.length} toolkit source{sources.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <Card
                key={source.id}
                className="group cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-0 overflow-hidden relative"
                onClick={() => handleCardClick(source.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors truncate">
                        {source.name}
                      </CardTitle>
                      <CardDescription className="uppercase text-xs font-medium">
                        {(source.source_type as string) || "unknown"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                    {source.description || "No description available"}
                  </p>
                </CardContent>
              </Card>
            ))}
            {sources.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No toolkit sources found. Create one to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toolkit Source Details</DialogTitle>
          </DialogHeader>

          {isLoadingDetails && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          )}

          {detailsError && (
            <div className="py-4">
              <p className="text-destructive">{detailsError}</p>
            </div>
          )}

          {sourceDetails && !isLoadingDetails && (
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

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {sourceDetails.description || "No description available"}
                </p>
              </div>

              {/* Configuration */}
              {(sourceDetails.configuration.server_url ||
                sourceDetails.configuration.transport ||
                sourceDetails.configuration.credentials !== undefined) && (
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
                      {sourceDetails.configuration.credentials !== undefined && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Credentials</span>
                          <span className="text-sm text-muted-foreground">
                            {sourceDetails.configuration.credentials ? "Configured" : "None"}
                          </span>
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
                  <span className="text-xs font-medium">Last Updated At</span>
                  <span>{formatDate(sourceDetails.updated_at)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isLoadingDetails || !sourceDetails}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteSourceId !== null} onOpenChange={(open) => !open && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Toolkit Source?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sources.find(s => s.id === deleteSourceId)?.name}"? This action cannot be undone. The toolkit source will be permanently removed.
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
    </div>
  );
};

export default ToolSources;