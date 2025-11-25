import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { listToolkits, createToolkit, type Toolkit, type ToolkitSourceDetail } from "@/lib/api/tools";
import { DEFAULT_PROJECT_ID } from "@/lib/api/client";
import CreateMcpToolSource from "@/pages/tools/CreateMcpToolSource";
import CreateOpenAPIToolSource from "@/pages/tools/CreateOpenAPIToolSource";

type SourceType = "mcp" | "api" | "";

const Toolkits = () => {
  const navigate = useNavigate();
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("");
  const [isImporting, setIsImporting] = useState(false);

  const handleToolkitClick = (toolkitId: string) => {
    navigate(`/toolkits/${toolkitId}`);
  };

  const fetchToolkits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const toolkitsData = await listToolkits(DEFAULT_PROJECT_ID);
      setToolkits(toolkitsData);
    } catch (err: any) {
      setError(err.message || "Failed to load toolkits");
      console.error("Failed to load toolkits:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToolkits();
  }, []);

  useEffect(() => {
    if (!isDialogOpen) {
      // Reset form when dialog closes
      setSourceType("");
      setIsImporting(false);
    }
  }, [isDialogOpen]);

  const handleSourceCreated = async (source: ToolkitSourceDetail) => {
    setIsImporting(true);

    try {
      // Step 1: Create toolkit from the source
      const toolkitData = {
        name: source.name,
        toolkit_source_id: source.id,
        description: source.description || undefined,
      };

      const createdToolkit = await createToolkit(toolkitData);

      await fetchToolkits();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to create toolkit:", error);
      // Error will be shown by the child component
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading toolkits...</p>
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
        <Button onClick={() => setIsDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Import Tools
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            Showing {toolkits.length} toolkit{toolkits.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolkits.map((toolkit) => (
              <Card
                key={toolkit.id}
                className="group cursor-pointer transition-all duration-200 hover:scale-[1.02] min-w-0 overflow-hidden"
                onClick={() => handleToolkitClick(toolkit.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors truncate">
                    {toolkit.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
                    {toolkit.description || "No description available"}
                  </p>
                </CardContent>
              </Card>
            ))}
            {toolkits.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No toolkits found. Create one to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Tools</DialogTitle>
            <DialogDescription>
              Create a toolkit by importing from an MCP server or OpenAPI specification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!sourceType ? (
              <div className="space-y-2">
                <Label htmlFor="source-type">Toolkit Source *</Label>
                <Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
                  <SelectTrigger id="source-type">
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcp">MCP Server</SelectItem>
                    <SelectItem value="api">OpenAPI Specification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Source Type: {sourceType === "mcp" ? "MCP Server" : "OpenAPI Specification"}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSourceType("")}
                    disabled={isImporting}
                  >
                    Change
                  </Button>
                </div>

                <div className="border-t pt-4">
                  {sourceType === "mcp" && (
                    <CreateMcpToolSource
                      onSuccess={handleSourceCreated}
                      onCancel={() => setIsDialogOpen(false)}
                      showBackButton={false}
                      buttonText="Import"
                      inDialog={true}
                    />
                  )}
                  {sourceType === "api" && (
                    <CreateOpenAPIToolSource
                      onSuccess={handleSourceCreated}
                      onCancel={() => setIsDialogOpen(false)}
                      showBackButton={false}
                      buttonText="Import"
                      inDialog={true}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Toolkits;