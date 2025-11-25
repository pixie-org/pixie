import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload } from "lucide-react";
import { createToolkitSource, type ToolkitSourceDetail } from "@/lib/api/tools";

interface CreateOpenAPIToolSourceProps {
  onSuccess?: (source: ToolkitSourceDetail) => void;
  onCancel?: () => void;
  showBackButton?: boolean;
  buttonText?: string;
  inDialog?: boolean;
}

const CreateOpenAPIToolSource = ({
  onSuccess,
  onCancel,
  showBackButton = true,
  buttonText = "Create Source",
  inDialog = false
}: CreateOpenAPIToolSourceProps = {}) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [openApiFile, setOpenApiFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOpenApiFile(file);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setCreateError("Please enter a name for the source");
      return;
    }

    if (!endpoint.trim()) {
      setCreateError("Please enter an endpoint URL");
      return;
    }

    if (!openApiFile) {
      setCreateError("Please upload an OpenAPI specification file");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const fileContent = await openApiFile.text();
      const sourceData = {
        name: name.trim(),
        source_type: "openapi_spec",
        description: description.trim() || `${name.trim()} OpenAPI specification`,
        configuration: {
          openapi_spec: fileContent,
          endpoint: endpoint.trim(),
        },
      };

      const createdSource = await createToolkitSource(sourceData);

      if (onSuccess) {
        onSuccess(createdSource);
      } else {
        // Navigate back to tool sources on success (default behavior)
        navigate("/toolkit-sources");
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
      navigate("/toolkit-sources");
    }
  };

  const content = (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="My OpenAPI specification"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="My OpenAPI specification with bunch of APIs"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">API Endpoint URL *</Label>
          <Input
            id="endpoint"
            type="url"
            placeholder="https://api.example.com"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            The base URL where the API is hosted
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openapi-file">OpenAPI Specification File *</Label>
          <Input
            id="openapi-file"
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileChange}
            required
          />
          {openApiFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {openApiFile.name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Button
          className="w-full"
          onClick={handleCreate}
          disabled={isCreating || !name.trim() || !endpoint.trim() || !openApiFile}
        >
          {isCreating ? (
            "Creating source..."
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
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

export default CreateOpenAPIToolSource;
