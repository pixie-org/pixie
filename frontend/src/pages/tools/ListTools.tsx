import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import ToolsList, { Tool } from "@/components/ToolsList";
import { listTools, getTool, updateTool, deleteTool, convertToolListToTool, convertToolResponseToTool } from "@/lib/api/tools";
import { DEFAULT_PROJECT_ID } from "@/lib/api/client";

const ListTools = () => {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tools function - can be called on mount and after updates/deletes
  const fetchTools = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const toolListResponses = await listTools(DEFAULT_PROJECT_ID);

      // Convert API responses to internal Tool format
      const convertedTools = toolListResponses.map(convertToolListToTool);

      // For each tool, fetch full details to get endpoint config
      const toolsWithDetails = await Promise.all(
        convertedTools.map(async (tool) => {
          try {
            const fullToolResponse = await getTool(tool.id, DEFAULT_PROJECT_ID);
            return convertToolResponseToTool(fullToolResponse);
          } catch (err) {
            // If fetching full details fails, use the basic info
            console.warn(`Failed to fetch details for tool ${tool.id}:`, err);
            return tool;
          }
        })
      );

      setTools(toolsWithDetails);
    } catch (err: any) {
      setError(err.message || "Failed to load tools");
      console.error("Failed to load tools:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tools on component mount
  useEffect(() => {
    fetchTools();
  }, []);

  const handleEditUX = (tool: Tool) => {
    navigate(`/tools/${tool.id}/edit-ux`);
  };

  const handleImportTypeSelect = (type: "mcp" | "api") => {
    navigate(`/import-tool?type=${type}`);
  };

  const handleToolUpdate = async (updatedTool: Tool) => {
    try {
      // Prepare update data - only updatable fields (tool_name, tool_description, status)
      const updateData = {
        tool_name: updatedTool.name,
        tool_description: updatedTool.description,
        status: updatedTool.status || "active",
      };

      // Call the update API endpoint with PATCH
      await updateTool(updatedTool.id, updateData, DEFAULT_PROJECT_ID);

      // Refetch tools from API to ensure consistency
      await fetchTools();
    } catch (error) {
      console.error("Failed to update tool:", error);
      // Optionally show error toast/notification here
    }
  };

  const handleToolDelete = async (toolId: string) => {
    try {
      // Call the delete API endpoint
      await deleteTool(toolId, DEFAULT_PROJECT_ID);

      // Refetch tools from API to ensure the deleted tool is removed
      await fetchTools();
    } catch (error) {
      console.error("Failed to delete tool:", error);
      // Optionally show error toast/notification here
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading tools...</p>
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
      <ToolsList
        tools={tools}
        onToolUpdate={handleToolUpdate}
        onToolDelete={handleToolDelete}
        onEditUX={handleEditUX}
        importButton={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Import tools
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleImportTypeSelect("mcp")}>
                MCP Server
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleImportTypeSelect("api")}>
                API Endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        } />
    </div>
  );
};

export default ListTools;
