import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import ToolsList, { Tool } from "@/components/ToolsList";
import { importTool, convertToolToToolCreate } from "@/lib/api/tools";
import { DEFAULT_PROJECT_ID } from "@/lib/api/client";

interface ToolSelectionViewProps {
  tools: Tool[];
  title?: string;
  description?: string;
  onBack?: () => void;
  onToolUpdate?: (tool: Tool) => void;
}

const ToolSelectionView = ({ tools, title = "Import Tool", description, onBack, onToolUpdate }: ToolSelectionViewProps) => {
  const navigate = useNavigate();
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localTools, setLocalTools] = useState<Tool[]>(tools);

  // Update local tools when tools prop changes
  useEffect(() => {
    setLocalTools(tools);
  }, [tools]);

  const handleToolUpdate = (updatedTool: Tool) => {
    setLocalTools(localTools.map(t => t.id === updatedTool.id ? updatedTool : t));
    if (onToolUpdate) {
      onToolUpdate(updatedTool);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/tools");
    }
  };

  const handleImport = async () => {
    if (selectedToolIds.length === 0) {
      setError("Please select at least one tool to import");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const selectedTools = localTools.filter(t => selectedToolIds.includes(t.id));

      // Import each tool via API
      const importPromises = selectedTools.map(tool => {
        const toolCreate = convertToolToToolCreate(tool);
        return importTool(toolCreate, DEFAULT_PROJECT_ID);
      });

      await Promise.all(importPromises);

      // Navigate back to tools list after successful import
      navigate("/tools");
    } catch (error: any) {
      setError(error.message || "Failed to import tools");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const displayDescription = description ||
    `Connected successfully. Found ${localTools.length} tool${localTools.length !== 1 ? "s" : ""}. Select tools to import.`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleImport}
          disabled={isImporting || selectedToolIds.length === 0}
        >
          {isImporting ? (
            "Importing..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Import {selectedToolIds.length > 0 ? `(${selectedToolIds.length})` : ""}
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <ToolsList
        tools={localTools}
        selectable={true}
        onSelectionChange={setSelectedToolIds}
        onToolUpdate={handleToolUpdate}
        showEditButton={true}
      />
    </div>
  );
};

export default ToolSelectionView;

