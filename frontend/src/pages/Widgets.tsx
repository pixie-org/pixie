import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, Palette, Pencil, X, Trash2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { listWidgets, getWidget, updateWidget, deleteWidget, type WidgetListResponse, type WidgetResponse } from "@/lib/api/widgets";
import { listToolkits, listToolkitTools, type Toolkit } from "@/lib/api/tools";
import { useProject } from "@/contexts/ProjectContext";
import type { Tool } from "@/components/ToolsList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 20;

const Widgets = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [widgets, setWidgets] = useState<WidgetListResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editToolIds, setEditToolIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Tool selection state for edit dialog
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [selectedToolkitId, setSelectedToolkitId] = useState<string>("");
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTools, setSelectedTools] = useState<Map<string, Tool>>(new Map());
  const [isLoadingToolkits, setIsLoadingToolkits] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingWidget, setDeletingWidget] = useState<WidgetListResponse | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleWidgetClick = (widgetId: string, e?: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!selectedProject) return;
    // Navigate to widget UX edit page with project scope
    navigate(`/projects/${selectedProject.id}/widgets/${widgetId}/edit-ux`);
  };

  const handleEditUX = (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;
    navigate(`/projects/${selectedProject.id}/widgets/${widgetId}/edit-ux`);
  };

  const handleEditDetails = async (widgetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;
    try {
      const widget = await getWidget(widgetId, selectedProject.id);
      setEditingWidget(widget);
      setEditName(widget.name);
      setEditDescription(widget.description || "");
      setEditToolIds(widget.tool_ids || []);
      setIsEditDialogOpen(true);

      // Reset tool selection state
      setSelectedToolkitId("");
      setTools([]);
      setSelectedTools(new Map());

      // Load toolkits first
      await loadToolkits();

      // Then load tools for selected tool IDs if any
      if (widget.tool_ids && widget.tool_ids.length > 0) {
        await loadToolsForSelectedIds(widget.tool_ids);
      }
    } catch (err: any) {
      console.error("Failed to load widget:", err);
      setError(err.message || "Failed to load widget details");
    }
  };

  const loadToolkits = async () => {
    if (!selectedProject) return [];
    try {
      setIsLoadingToolkits(true);
      const toolkitsData = await listToolkits(selectedProject.id);
      setToolkits(toolkitsData);
      return toolkitsData;
    } catch (err: any) {
      console.error("Failed to load toolkits:", err);
      return [];
    } finally {
      setIsLoadingToolkits(false);
    }
  };

  const loadToolsForSelectedIds = async (toolIds: string[]) => {
    if (!selectedProject) return;
    // Load all toolkits and their tools to find matches
    const allTools: Tool[] = [];
    const toolsMap = new Map<string, Tool>();

    try {
      const toolkitsData = await listToolkits(selectedProject.id);

      for (const toolkit of toolkitsData) {
        try {
          const toolkitTools = await listToolkitTools(toolkit.id, selectedProject.id);
          toolkitTools.forEach(tool => {
            allTools.push(tool);
            toolsMap.set(tool.id, tool);
          });
        } catch (err) {
          console.error(`Failed to load tools from toolkit ${toolkit.id}:`, err);
        }
      }

      // Set selected tools
      const selected = new Map<string, Tool>();
      toolIds.forEach(toolId => {
        const tool = toolsMap.get(toolId);
        if (tool) {
          selected.set(toolId, tool);
        }
      });
      setSelectedTools(selected);
    } catch (err: any) {
      console.error("Failed to load tools:", err);
    }
  };

  useEffect(() => {
    const fetchTools = async () => {
      if (!selectedToolkitId || !selectedProject) {
        setTools([]);
        return;
      }

      try {
        setIsLoadingTools(true);
        const toolsData = await listToolkitTools(selectedToolkitId, selectedProject.id);
        setTools(toolsData);
      } catch (err: any) {
        console.error("Failed to load tools:", err);
        setTools([]);
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, [selectedToolkitId, selectedProject]);

  const handleToolToggle = (tool: Tool) => {
    const toolId = tool.id;
    if (editToolIds.includes(toolId)) {
      setEditToolIds(prev => prev.filter(id => id !== toolId));
      setSelectedTools(prev => {
        const newMap = new Map(prev);
        newMap.delete(toolId);
        return newMap;
      });
    } else {
      setEditToolIds(prev => [...prev, toolId]);
      setSelectedTools(prev => new Map(prev).set(toolId, tool));
    }
  };

  const handleRemoveTool = (toolId: string) => {
    setEditToolIds(prev => prev.filter(id => id !== toolId));
    setSelectedTools(prev => {
      const newMap = new Map(prev);
      newMap.delete(toolId);
      return newMap;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingWidget || !editName.trim() || !selectedProject) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateWidget(editingWidget.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        tool_ids: editToolIds,
      }, selectedProject.id);

      // Refresh widgets list
      await fetchWidgets(currentPage);
      setIsEditDialogOpen(false);
      setEditingWidget(null);
    } catch (err: any) {
      console.error("Failed to update widget:", err);
      setError(err.message || "Failed to update widget");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (widget: WidgetListResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingWidget(widget);
    setDeleteConfirmName("");
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmName !== deletingWidget?.name || !selectedProject) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWidget(deletingWidget.id, selectedProject.id);

      // Refresh widgets list
      await fetchWidgets(currentPage);
      setIsDeleteDialogOpen(false);
      setDeletingWidget(null);
      setDeleteConfirmName("");
    } catch (err: any) {
      console.error("Failed to delete widget:", err);
      setError(err.message || "Failed to delete widget");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchWidgets = async (page: number) => {
    if (!selectedProject) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const offset = (page - 1) * ITEMS_PER_PAGE;
      const response = await listWidgets(selectedProject.id, ITEMS_PER_PAGE, offset);
      setWidgets(response.items);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || "Failed to load widgets");
      console.error("Failed to load widgets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets(currentPage);
  }, [currentPage, selectedProject]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const startItem = total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, total);

  const handleCreateWidget = () => {
    if (!selectedProject) return;
    navigate(`/projects/${selectedProject.id}/widgets/create`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading widgets...</p>
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
        <Button onClick={handleCreateWidget}>
          <Plus className="h-4 w-4 mr-2" />
          Create Widget
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            Showing {startItem}-{endItem} of {total} widget{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.map((widget) => (
              <Card
                key={widget.id}
                className="group cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-0 overflow-hidden relative"
                onClick={(e) => handleWidgetClick(widget.id, e)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors truncate flex-1">
                      {widget.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleEditDetails(widget.id, e)}
                        title="Edit Details"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleEditUX(widget.id, e)}
                        title="Edit UX"
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(widget, e)}
                        title="Delete Widget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                    {widget.description || "No description available"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created: {widget.created_at ? new Date(widget.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {widgets.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No widgets found. Create a widget to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === 1}
                  className="gap-1 pl-2.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
              </PaginationItem>

              {/* Page numbers */}
              {(() => {
                const pages: (number | 'ellipsis')[] = [];

                // Always show first page
                pages.push(1);

                // Add ellipsis if needed before current page range
                if (currentPage > 3) {
                  pages.push('ellipsis');
                }

                // Add pages around current page
                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);

                for (let i = startPage; i <= endPage; i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                  }
                }

                // Add ellipsis if needed after current page range
                if (currentPage < totalPages - 2) {
                  pages.push('ellipsis');
                }

                // Always show last page (if more than 1 page)
                if (totalPages > 1) {
                  pages.push(totalPages);
                }

                // Remove duplicates
                const uniquePages: (number | 'ellipsis')[] = [];
                let lastValue: number | 'ellipsis' | null = null;
                for (const page of pages) {
                  if (page !== lastValue) {
                    uniquePages.push(page);
                    lastValue = page;
                  }
                }

                return uniquePages.map((page, index) => {
                  if (page === 'ellipsis') {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={page}>
                      <Button
                        variant={currentPage === page ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="h-9 w-9"
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  );
                });
              })()}

              <PaginationItem>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className="gap-1 pr-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Edit Widget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Widget Details</DialogTitle>
            <DialogDescription>
              Update the widget name, description, and associated tools
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Widget name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Widget description"
                className="min-h-[100px]"
                disabled={isSaving}
              />
            </div>

            {/* Tool Selection */}
            <div className="space-y-2">
              <Label>Tools (Optional)</Label>

              {/* Selected Tools Summary */}
              {selectedTools.size > 0 && (
                <div className="space-y-2 mb-2">
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                    {Array.from(selectedTools.values()).map((tool) => (
                      <Badge
                        key={tool.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">{tool.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full hover:bg-destructive/20"
                          onClick={() => handleRemoveTool(tool.id)}
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Toolkit Selection */}
              <div className="space-y-2">
                <Label htmlFor="edit-toolkit">Select Toolkit</Label>
                <Select
                  value={selectedToolkitId}
                  onValueChange={setSelectedToolkitId}
                  disabled={isSaving || isLoadingToolkits}
                >
                  <SelectTrigger id="edit-toolkit">
                    <SelectValue placeholder={isLoadingToolkits ? "Loading toolkits..." : "Choose a toolkit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {toolkits.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No toolkits available
                      </SelectItem>
                    ) : (
                      toolkits.map((toolkit) => (
                        <SelectItem key={toolkit.id} value={toolkit.id}>
                          {toolkit.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tools from Selected Toolkit */}
              {selectedToolkitId && (
                <div className="space-y-2">
                  <Label>Tools from Selected Toolkit</Label>
                  {isLoadingTools ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : tools.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No tools available in this toolkit.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                      {tools.map((tool) => {
                        const isSelected = editToolIds.includes(tool.id);
                        return (
                          <div
                            key={tool.id}
                            className="flex items-center space-x-2 py-1 px-2 rounded-md"
                          >
                            <Checkbox
                              id={`edit-tool-${tool.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToolToggle(tool)}
                              disabled={isSaving}
                            />
                            <Label
                              htmlFor={`edit-tool-${tool.id}`}
                              className="flex-1 cursor-pointer text-sm font-normal"
                            >
                              <div className="font-medium">{tool.name}</div>
                              {tool.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {tool.description}
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || !editName.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Widget Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Widget</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the widget and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-name">
                Type <strong>{deletingWidget?.name}</strong> to confirm deletion:
              </Label>
              <Input
                id="delete-confirm-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Widget name"
                disabled={isDeleting}
                className="font-mono"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting || deleteConfirmName !== deletingWidget?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Widget"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Widgets;

