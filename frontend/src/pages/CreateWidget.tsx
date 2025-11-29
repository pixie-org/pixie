import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, ArrowLeft, Loader2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { createWidget, listWidgets } from "@/lib/api/widgets";
import { listToolkits, listToolkitTools, type Toolkit } from "@/lib/api/tools";
import type { Tool } from "@/lib/tools";
import { getToolWarningTooltip } from "@/lib/tools";

const CreateWidget = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<Map<string, Tool>>(new Map());
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [selectedToolkitId, setSelectedToolkitId] = useState<string>("");
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoadingToolkits, setIsLoadingToolkits] = useState(true);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available toolkits
  useEffect(() => {
    const fetchToolkits = async () => {
      try {
        setIsLoadingToolkits(true);
        const projectId = urlProjectId as string;
        const toolkitsData = await listToolkits(projectId);
        setToolkits(toolkitsData);
      } catch (err: any) {
        console.error("Failed to load toolkits:", err);
        setError(`Failed to load toolkits: ${err.message}`);
      } finally {
        setIsLoadingToolkits(false);
      }
    };

    fetchToolkits();
  }, [urlProjectId]);

  // Fetch tools when toolkit is selected
  useEffect(() => {
    const fetchTools = async () => {
      if (!selectedToolkitId) {
        setTools([]);
        return;
      }

      try {
        setIsLoadingTools(true);
        const projectId = urlProjectId as string;
        const toolsData = await listToolkitTools(selectedToolkitId, projectId);
        setTools(toolsData);
      } catch (err: any) {
        console.error("Failed to load tools:", err);
        setError(`Failed to load tools: ${err.message}`);
        setTools([]);
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, [selectedToolkitId, urlProjectId]);

  // Auto-resize textareas
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [description]);

  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      promptTextareaRef.current.style.height = `${Math.min(promptTextareaRef.current.scrollHeight, 300)}px`;
    }
  }, [createPrompt]);

  const handleToolToggle = (tool: Tool) => {
    const toolId = tool.id;
    if (selectedToolIds.includes(toolId)) {
      // Remove tool
      setSelectedToolIds(prev => prev.filter(id => id !== toolId));
      setSelectedTools(prev => {
        const newMap = new Map(prev);
        newMap.delete(toolId);
        return newMap;
      });
    } else {
      // Add tool
      setSelectedToolIds(prev => [...prev, toolId]);
      setSelectedTools(prev => new Map(prev).set(toolId, tool));
    }
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedToolIds(prev => prev.filter(id => id !== toolId));
    setSelectedTools(prev => {
      const newMap = new Map(prev);
      newMap.delete(toolId);
      return newMap;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || !createPrompt.trim() || isCreating) {
      setError("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    setError(null);

    const widgetName = name.trim();

    try {
      const projectId = urlProjectId as string;
      await createWidget({
        name: widgetName,
        description: description.trim() || "",
        tool_ids: selectedToolIds,
        create_prompt: createPrompt.trim(),
      }, projectId);

      // Response is {status: "ok"}, so we need to fetch the widget to get its ID
      // Fetch widgets and find the one we just created by name
      // We'll check the first few pages to find it (most likely to be in the first page)
      let widgetId: string | null = null;
      let offset = 0;
      const limit = 20;

      while (offset < 100 && !widgetId) {
        const widgetsResponse = await listWidgets(projectId, limit, offset);
        const foundWidget = widgetsResponse.items.find(w => w.name === widgetName);

        if (foundWidget) {
          widgetId = foundWidget.id;
          break;
        }

        if (!widgetsResponse.has_next) {
          break;
        }

        offset += limit;
      }

      if (widgetId) {
        navigate(`/projects/${projectId}/widgets/${widgetId}/edit-ux`);
      } else {
        // Fallback: navigate to widgets list if we can't find the widget
        navigate(`/projects/${projectId}/widgets`);
      }
    } catch (err: any) {
      console.error("Failed to create widget:", err);
      setError(err.message || "Failed to create widget");
      setIsCreating(false);
    }
  };

  const canCreate = name.trim() && createPrompt.trim();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => {
          const projectId = urlProjectId as string;
          navigate(`/projects/${projectId}/widgets`);
        }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Create Widget</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-3xl mx-auto space-y-6 px-4">
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Provide basic details about your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Widget"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of what this widget does..."
                  className="min-h-[100px] max-h-[200px] resize-none"
                  disabled={isCreating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Create Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Create Prompt *</CardTitle>
              <CardDescription>
                Describe what you want to build. Be as detailed as possible - include functionality, design preferences, and any specific requirements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                ref={promptTextareaRef}
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                placeholder="Example: Create a weather widget that shows the current temperature, humidity, and a 5-day forecast. It should have a clean, modern design with a gradient background. Include icons for different weather conditions..."
                className="min-h-[120px] max-h-[300px] resize-none"
                disabled={isCreating}
              />
            </CardContent>
          </Card>

          {/* Tool Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Tools</CardTitle>
              <CardDescription>Select a toolkit and choose tools to associate with this widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Selected Tools Summary */}
              {selectedTools.size > 0 && (
                <div className="space-y-2">
                  <Label>Selected Tools ({selectedTools.size})</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                    {Array.from(selectedTools.values()).map((tool) => (
                      <Badge
                        key={tool.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">{tool.name}</span>
                        {getToolWarningTooltip(tool, "widget-creation")}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full hover:bg-destructive/20"
                          onClick={() => handleRemoveTool(tool.id)}
                          disabled={isCreating}
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
                <Label htmlFor="toolkit">Select Toolkit</Label>
                <Select
                  value={selectedToolkitId}
                  onValueChange={setSelectedToolkitId}
                  disabled={isCreating || isLoadingToolkits}
                >
                  <SelectTrigger id="toolkit">
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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : tools.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No tools available in this toolkit.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                      {tools.map((tool) => {
                        const isSelected = selectedToolIds.includes(tool.id);
                        return (
                          <div
                            key={tool.id}
                            className={cn(
                              "flex items-center space-x-2 py-2 px-2 rounded-md transition-colors",
                              isSelected && "bg-primary/10"
                            )}
                          >
                            <Checkbox
                              id={`tool-${tool.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToolToggle(tool)}
                              disabled={isCreating}
                            />
                            <Label
                              htmlFor={`tool-${tool.id}`}
                              className="flex-1 cursor-pointer text-sm font-normal"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{tool.name}</span>
                                {getToolWarningTooltip(tool, "widget-creation")}
                              </div>
                              {tool.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
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

              {!selectedToolkitId && toolkits.length > 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Select a toolkit above to view and select tools
                </p>
              )}
            </CardContent>
          </Card>

          {/* Create Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleCreate}
              disabled={!canCreate || isCreating}
              size="lg"
              className={cn(
                "relative overflow-hidden min-w-[200px] h-12",
                "bg-gradient-to-r from-primary via-primary/90 to-primary",
                "hover:from-primary/90 hover:via-primary hover:to-primary/90",
                "transition-all duration-300 shadow-lg",
                "hover:shadow-xl hover:scale-105",
                (!canCreate || isCreating) && "opacity-75 cursor-not-allowed hover:scale-100"
              )}
            >
              {isCreating ? (
                <>
                  <Wand2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Widget
                </>
              )}

              {/* Magic sparkle effect overlay */}
              {!isCreating && canCreate && (
                <div className="absolute inset-0 overflow-hidden rounded-md">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWidget;

