import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Link as LinkIcon, Image, FileUp, Download, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  uploadLogo,
  uploadUxDesign,
  listDesigns,
  deleteDesign as deleteDesignApi,
  downloadDesign as downloadDesignApi,
  type Design,
} from "@/lib/api/design";
import { useProject } from "@/contexts/ProjectContext";

const Designs = () => {
  const { toast } = useToast();
  const { /* selectedProject, */ isLoading, projects } = useProject();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = urlProjectId as string;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [websiteLink, setWebsiteLink] = useState("");
  const [figmaFile, setFigmaFile] = useState<File | null>(null);
  const [uxScreenshotFile, setUxScreenshotFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDesigns = async (designType?: "logo" | "ux_design") => {
    // If there are no projects, surface a clear message and skip calling the API
    if (!projects || projects.length === 0) {
      setDesigns([]);
      setSaveError("No projects available. Please create a project first.");
      return;
    }

    setIsLoadingDesigns(true);
    try {
      const data = await listDesigns(designType, projectId);
      setDesigns(data.items);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to fetch designs');
      console.error('Failed to fetch designs:', error);
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  const deleteDesign = async (designId: string) => {
    const design = designs.find(d => d.id === designId);
    const designName = design?.filename || 'design';
    
    setDeletingId(designId);
    try {
      await deleteDesignApi(designId, projectId);

      // Show success toast
      toast({
        title: "Design deleted",
        description: `${designName} has been deleted successfully.`,
      });

      // Refresh the designs list
      await fetchDesigns();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete design';
      setSaveError(errorMessage);
      toast({
        title: "Error deleting design",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const downloadDesign = async (design: Design) => {
    try {
      await downloadDesignApi(design.id, design.filename, projectId);

      toast({
        title: "Download started",
        description: `${design.filename} is being downloaded.`,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to download design';
      setSaveError(errorMessage);
      toast({
        title: "Error downloading design",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isLoading && projects && projects.length > 0) {
      fetchDesigns();
    }
  }, [isLoading, projects]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setSaveError("Please upload a valid image file (PNG, JPEG, SVG, GIF, or WebP)");
        return;
      }
      // Validate file size (10MB max for logos)
      if (file.size > 10 * 1024 * 1024) {
        setSaveError("Logo file size exceeds 10MB limit");
        return;
      }
      setLogoFile(file);
      setSaveError(null);
    }
  };

  const handleFigmaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept Figma files - typically .fig or other design formats
      const validTypes = ['application/octet-stream', 'application/json', 'application/zip'];
      const validExtensions = ['.fig', '.sketch', '.xd', '.ai'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!validTypes.includes(file.type) && !hasValidExtension) {
        setSaveError("Please upload a valid design file (.fig, .sketch, .xd, .ai, or other design formats)");
        return;
      }
      // Validate file size (50MB max for UX designs)
      if (file.size > 50 * 1024 * 1024) {
        setSaveError("Figma file size exceeds 50MB limit");
        return;
      }
      setFigmaFile(file);
      setSaveError(null);
    }
  };

  const handleUxScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept images and PDFs for UX screenshots
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif', 'image/webp'];
      const validPdfType = 'application/pdf';
      const isValidType = validImageTypes.includes(file.type) || file.type === validPdfType;
      
      if (!isValidType) {
        setSaveError("Please upload a valid image file (PNG, JPEG, SVG, GIF, WebP) or PDF");
        return;
      }
      // Validate file size (50MB max for UX designs)
      if (file.size > 50 * 1024 * 1024) {
        setSaveError("UX screenshot file size exceeds 50MB limit");
        return;
      }
      setUxScreenshotFile(file);
      setSaveError(null);
    }
  };

  const handleSave = async () => {
    if (!logoFile && !figmaFile && !uxScreenshotFile) {
      setSaveError("Please upload at least one file (logo, Figma design, or UX screenshot)");
      return;
    }

    if (websiteLink.trim() && !validateUrl(websiteLink)) {
      setSaveError("Please enter a valid URL");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const uploadPromises: Promise<Design>[] = [];

      // Upload logo if provided
      if (logoFile) {
        uploadPromises.push(uploadLogo(logoFile, projectId));
      }

      // Upload Figma file as UX design if provided
      if (figmaFile) {
        uploadPromises.push(uploadUxDesign(figmaFile, projectId));
      }

      // Upload UX screenshot if provided
      if (uxScreenshotFile) {
        uploadPromises.push(uploadUxDesign(uxScreenshotFile, projectId));
      }

      await Promise.all(uploadPromises);

      setSaveSuccess(true);
      // Refresh designs list
      await fetchDesigns();
      
      // Reset form after successful save
      setName("");
      setDescription("");
      setLogoFile(null);
      setWebsiteLink("");
      setFigmaFile(null);
      setUxScreenshotFile(null);
      
      // Reset file inputs
      const logoInput = document.getElementById('logo-file') as HTMLInputElement;
      const figmaInput = document.getElementById('figma-file') as HTMLInputElement;
      const uxInput = document.getElementById('ux-screenshot-file') as HTMLInputElement;
      if (logoInput) logoInput.value = '';
      if (figmaInput) figmaInput.value = '';
      if (uxInput) uxInput.value = '';
    } catch (error: any) {
      setSaveError(error.message || "Failed to save design");
      console.error("Failed to save design:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const validateUrl = (url: string) => {
    if (!url.trim()) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Designs</TabsTrigger>
          <TabsTrigger value="list">View Designs</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Design Configuration</CardTitle>
              <CardDescription>
                Upload your logo files, Figma designs, or UX screenshots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Upload your logo file, Figma design files, or UX screenshots. Logo files are limited to 10MB, while UX designs and screenshots are limited to 50MB.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-file">Logo File (Max 10MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo-file"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp"
                      onChange={handleLogoFileChange}
                      className="flex-1"
                    />
                  </div>
                  {logoFile && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Selected: {logoFile.name} ({formatFileSize(logoFile.size)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website-link">Website Link (Optional)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website-link"
                      type="url"
                      placeholder="https://example.com"
                      value={websiteLink}
                      onChange={(e) => {
                        setWebsiteLink(e.target.value);
                        if (e.target.value && !validateUrl(e.target.value)) {
                          setSaveError("Please enter a valid URL");
                        } else {
                          setSaveError(null);
                        }
                      }}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide a website link to import design assets from
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="figma-file">Figma Designs (Max 50MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="figma-file"
                      type="file"
                      accept=".fig,.sketch,.xd,.ai,application/octet-stream,application/json,application/zip"
                      onChange={handleFigmaFileChange}
                      className="flex-1"
                    />
                  </div>
                  {figmaFile && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                      <FileUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Selected: {figmaFile.name} ({formatFileSize(figmaFile.size)})
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload Figma design files (.fig, .sketch, .xd, .ai, or other design formats)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ux-screenshot-file">UX Screenshots (Max 50MB)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ux-screenshot-file"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp,application/pdf"
                      onChange={handleUxScreenshotFileChange}
                      className="flex-1"
                    />
                  </div>
                  {uxScreenshotFile && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Selected: {uxScreenshotFile.name} ({formatFileSize(uxScreenshotFile.size)})
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload UX screenshots as images (PNG, JPEG, SVG, GIF, WebP) or PDF files
                  </p>
                </div>

                {saveError && (
                  <Alert variant="destructive">
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                )}

                {saveSuccess && (
                  <Alert>
                    <AlertDescription>Design uploaded successfully!</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || (!logoFile && !figmaFile && !uxScreenshotFile) || (!!websiteLink.trim() && !validateUrl(websiteLink))}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Designs
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Designs</CardTitle>
              <CardDescription>
                View and manage your uploaded logo files and UX designs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDesigns()}
                  disabled={isLoadingDesigns}
                >
                  {isLoadingDesigns ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "All"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDesigns("logo")}
                  disabled={isLoadingDesigns}
                >
                  Logos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDesigns("ux_design")}
                  disabled={isLoadingDesigns}
                >
                  UX Designs
                </Button>
              </div>

              {isLoadingDesigns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : designs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No designs uploaded yet. Upload your first design in the "Upload Designs" tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {designs.map((design) => (
                    <Card key={design.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {design.design_type === "logo" ? (
                              <Image className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileUp className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{design.filename}</span>
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {design.design_type === "logo" ? "Logo" : "UX Design"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Size: {formatFileSize(design.file_size)}</div>
                            <div>Type: {design.content_type}</div>
                            <div>Uploaded: {formatDate(design.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDesign(design)}
                            title="Download design"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingId === design.id}
                                title="Delete design"
                              >
                                {deletingId === design.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Design</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{design.filename}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDesign(design.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Designs;

