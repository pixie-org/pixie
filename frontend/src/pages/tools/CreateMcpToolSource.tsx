import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Zap, ArrowLeft } from "lucide-react";
import { createToolkitSource, type ToolkitSourceDetail } from "@/lib/api/tools";

interface CreateMcpToolSourceProps {
  projectId: string;
  onSuccess?: (source: ToolkitSourceDetail) => void;
  onCancel?: () => void;
  showBackButton?: boolean;
  buttonText?: string;
  inDialog?: boolean;
}

const CreateMcpToolSource = ({
  projectId,
  onSuccess,
  onCancel,
  showBackButton = true,
  buttonText = "Create Source",
  inDialog = false
}: CreateMcpToolSourceProps) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transportType, setTransportType] = useState<"streamable-http">("streamable-http");
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("authentication");

  const handleMCPConnect = async () => {
    if (!name.trim()) {
      setCreateError("Please enter a name for the source");
      return;
    }

    if (!url.trim()) {
      setCreateError("Please enter a server URL");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const sourceData = {
        name: name.trim(),
        source_type: "mcp_server",
        description: description.trim() || `${name.trim()} MCP server connection`,
        configuration: {
          transport: transportType,
          server_url: url.trim(),
          credentials: null,
        },
      };

      const createdSource = await createToolkitSource(sourceData, projectId);

      if (onSuccess) {
        onSuccess(createdSource);
      } else {
        // Navigate back to toolkits for this project on success (default behavior)
        navigate(`/projects/${projectId}/toolkits`);
      }
    } catch (error: any) {
      setCreateError(error.message || "Failed to create toolkit source");
      console.error("Failed to create toolkit source:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/projects/${projectId}/toolkits`);
    }
  };

  const content = (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="My MCP server"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="My MCP server with bunch of tools"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transport-type">Transport Type</Label>
          <Select
            value={transportType}
            onValueChange={(value) =>
              setTransportType(value as any)
            }
          >
            <SelectTrigger id="transport-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streamable-http">
                Streamable HTTP
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Server URL *</Label>
          <Input
            id="url"
            placeholder="http://localhost:9000/mcp"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="authentication">
            <Shield className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="headers">
            Custom Headers
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>
        <TabsContent value="authentication" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Authentication settings coming soon
          </p>
        </TabsContent>
        <TabsContent value="headers" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Custom headers settings coming soon
          </p>
        </TabsContent>
        <TabsContent value="configuration" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Configuration settings coming soon
          </p>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button
          className="w-full"
          onClick={handleMCPConnect}
          disabled={isCreating || !url.trim() || !name.trim()}
        >
          {isCreating ? (
            "Creating source..."
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {buttonText}
            </>
          )}
        </Button>
        {createError && (
          <p className="text-sm text-destructive mt-2">
            {createError}
          </p>
        )}
      </div>
    </>
  );

  if (inDialog) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="space-y-6">
      {showBackButton && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <Card>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMcpToolSource;

