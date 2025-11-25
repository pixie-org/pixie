import { useState, useEffect } from "react";
import { getTool, updateTool, deleteTool, convertToolResponseToTool, DEFAULT_PROJECT_ID } from "@/lib/api";
import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tool, MCPEndpointConfig, APIEndpointConfig } from "./ToolsList";
import { Badge } from "@/components/ui/badge";

interface EditToolDialogProps {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tool: Tool) => void;
  onDelete?: (toolId: string) => void;
}

const EditToolDialog = ({ tool, open, onOpenChange, onSave, onDelete }: EditToolDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"active" | "disabled">("active");
  const [isLoadingTool, setIsLoadingTool] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadToolDetails = async () => {
      if (tool && tool.id) {
        // If tool doesn't have full endpoint config, fetch it from API
        const hasFullConfig = tool.endpointConfig && 
          (Object.keys(tool.endpointConfig).length > 0 || 
           (tool.endpointType === "api" && (tool.endpointConfig as any).endpoint) ||
           (tool.endpointType === "mcp" && (tool.endpointConfig as any).url));

        if (!hasFullConfig) {
          setIsLoadingTool(true);
          try {
            const fullToolResponse = await getTool(tool.id, DEFAULT_PROJECT_ID);
            const fullTool = convertToolResponseToTool(fullToolResponse);
            setName(fullTool.name);
            setDescription(fullTool.description);
            setStatus(fullTool.status || "active");
          } catch (error) {
            console.error("Failed to load tool details:", error);
            // Fall back to provided tool data
            setName(tool.name);
            setDescription(tool.description);
            setStatus(tool.status || "active");
          } finally {
            setIsLoadingTool(false);
          }
        } else {
          setName(tool.name);
          setDescription(tool.description);
          setStatus(tool.status || "active");
        }
      }
    };

    loadToolDetails();
  }, [tool]);

  const handleStatusChange = (checked: boolean) => {
    const newStatus = checked ? "active" : "disabled";
    
    // If disabling, show confirmation dialog
    if (newStatus === "disabled" && status === "active") {
      setPendingStatus("disabled");
      setShowDisableConfirm(true);
    } else {
      setStatus(newStatus);
    }
  };

  const handleConfirmDisable = () => {
    setStatus("disabled");
    setShowDisableConfirm(false);
    setPendingStatus("active");
  };

  const handleCancelDisable = () => {
    setShowDisableConfirm(false);
    setPendingStatus("active");
  };

  const handleSave = async () => {
    if (!tool) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Prepare update data - only updatable fields
      const updateData = {
        tool_name: name,
        tool_description: description,
        status: status,
      };

      // Call update endpoint with PATCH
      const updatedToolResponse = await updateTool(tool.id, updateData, DEFAULT_PROJECT_ID);
      
      // Convert back to internal format
      const convertedTool = convertToolResponseToTool(updatedToolResponse);
      
      // Call the onSave callback with updated tool
      onSave(convertedTool);
      onOpenChange(false);
    } catch (error: any) {
      setSaveError(error.message || "Failed to update tool");
      console.error("Failed to update tool:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!tool) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTool(tool.id, DEFAULT_PROJECT_ID);
      
      // Call the onDelete callback
      if (onDelete) {
        onDelete(tool.id);
      }
      
      onOpenChange(false);
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete tool");
      console.error("Failed to delete tool:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const renderEndpointConfig = () => {
    if (!tool) return null;

    if (tool.endpointType === "mcp") {
      const config = tool.endpointConfig as MCPEndpointConfig;
      return (
        <div className="space-y-2">
          <Label>MCP Configuration</Label>
          <div className="rounded-md border bg-muted p-3 space-y-2 text-sm">
            <div>
              <span className="font-medium">Transport:</span> {config.transportType}
            </div>
            <div>
              <span className="font-medium">URL:</span> {config.url}
            </div>
            <div>
              <span className="font-medium">Connection Type:</span> {config.connectionType}
            </div>
            {config.autoSwitch && (
              <div>
                <span className="font-medium">Auto-switch:</span> Enabled
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tool.endpointType === "api") {
      const config = tool.endpointConfig as APIEndpointConfig;
      return (
        <div className="space-y-2">
          <Label>API Configuration</Label>
          <div className="rounded-md border bg-muted p-3 space-y-2 text-sm">
            <div>
              <span className="font-medium">Endpoint:</span> {config.endpoint}
            </div>
            {config.timeout && (
              <div>
                <span className="font-medium">Timeout:</span> {config.timeout}ms
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Tool</DialogTitle>
          <DialogDescription>
            Update tool details. Tool ID, endpoint type, and endpoint configuration cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tool-id">Tool ID</Label>
            <Input
              id="tool-id"
              value={tool.toolId}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Tool ID is generated by the backend and cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpoint-type">Endpoint Type</Label>
            <div>
              <Badge variant="secondary" className="text-sm">
                {tool.endpointType.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoint type cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-name">Tool Name</Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tool name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter tool description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tool-status">Status</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this tool
                </p>
              </div>
              <Switch
                id="tool-status"
                checked={status === "active"}
                onCheckedChange={handleStatusChange}
              />
            </div>
          </div>

          {renderEndpointConfig()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick}
                disabled={isSaving || isDeleting}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving || isDeleting}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Tool?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable "{tool.name}"? This tool will no longer be available for use until it is re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDisable}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disable Tool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tool?.name}"? This action cannot be undone. The tool will be permanently removed from the project.
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
              {isDeleting ? "Deleting..." : "Delete Tool"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default EditToolDialog;

