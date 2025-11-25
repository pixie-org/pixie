import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, Trash2, Pause } from "lucide-react";
import { 
  getWidget, 
  getWidgetDeployment, 
  listWidgetDeployments,
  deleteWidgetDeployment, 
  suspendWidgetDeployment,
  listWidgets,
  type WidgetResponse,
  type WidgetDeploymentResponse,
  type WidgetDeploymentListResponse,
  type WidgetListResponse
} from "@/lib/api";

const WidgetPlayground = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const widgetId = searchParams.get("widgetId");
  const deploymentId = searchParams.get("deploymentId");

  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [deployment, setDeployment] = useState<WidgetDeploymentResponse | null>(null);
  const [deployments, setDeployments] = useState<WidgetDeploymentListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [availableWidgets, setAvailableWidgets] = useState<WidgetListResponse[]>([]);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(widgetId || "");

  useEffect(() => {
    if (widgetId) {
      setSelectedWidgetId(widgetId);
    }
  }, [widgetId]);

  useEffect(() => {
    const fetchAvailableWidgets = async () => {
      if (widgetId) return;

      setIsLoadingWidgets(true);
      try {
        const response = await listWidgets(100, 0); // Get first 100 widgets for selection
        setAvailableWidgets(response.items);
      } catch (err: any) {
        console.error("Failed to load available widgets:", err);
      } finally {
        setIsLoadingWidgets(false);
      }
    };

    fetchAvailableWidgets();
  }, [widgetId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!widgetId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [widgetData, deploymentsData] = await Promise.all([
          getWidget(widgetId),
          listWidgetDeployments(widgetId),
        ]);

        setWidget(widgetData);
        setDeployments(deploymentsData);

        if (deploymentId) {
          try {
            const deploymentData = await getWidgetDeployment(deploymentId);
            setDeployment(deploymentData);
          } catch (err: any) {
            console.error("Failed to load deployment:", err);
            if (deploymentsData.length > 0) {
              const firstDeployment = await getWidgetDeployment(deploymentsData[0].id);
              setDeployment(firstDeployment);
            }
          }
        } else if (deploymentsData.length > 0) {
          const firstDeployment = await getWidgetDeployment(deploymentsData[0].id);
          setDeployment(firstDeployment);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load widget playground data");
        console.error("Failed to load widget playground:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [widgetId, deploymentId]);

  const handleWidgetSelect = (value: string) => {
    setSelectedWidgetId(value);
    navigate(`/widget-playground?widgetId=${value}`);
  };

  const handleDelete = async () => {
    if (!deployment) return;

    setIsDeleting(true);
    try {
      await deleteWidgetDeployment(deployment.id);
      const updatedDeployments = deployments.filter(d => d.id !== deployment.id);
      setDeployments(updatedDeployments);
      if (updatedDeployments.length > 0) {
        try {
          const deploymentData = await getWidgetDeployment(updatedDeployments[0].id);
          setDeployment(deploymentData);
        } catch (err) {
          console.error("Failed to load next deployment:", err);
          setDeployment(null);
        }
      } else {
        setDeployment(null);
      }
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error("Failed to delete deployment:", error);
      alert(`Failed to delete deployment: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuspend = async () => {
    if (!deployment) return;

    setIsSuspending(true);
    try {
      const updatedDeployment = await suspendWidgetDeployment(deployment.id);
      setDeployment(updatedDeployment);
      const updatedDeployments = deployments.map(d => 
        d.id === deployment.id ? updatedDeployment : d
      );
      setDeployments(updatedDeployments);
      setShowSuspendDialog(false);
    } catch (error: any) {
      console.error("Failed to suspend deployment:", error);
      alert(`Failed to suspend deployment: ${error.message || "Unknown error"}`);
    } finally {
      setIsSuspending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "deploying":
        return "secondary";
      case "suspended":
        return "outline";
      case "error":
        return "destructive";
      case "deleted":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading || isLoadingWidgets) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading widget playground...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!widgetId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Widget</CardTitle>
            <CardDescription>Choose a widget to view its deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="widget-select">Widget</Label>
              <Select value={selectedWidgetId} onValueChange={handleWidgetSelect}>
                <SelectTrigger id="widget-select">
                  <SelectValue placeholder="Select a widget" />
                </SelectTrigger>
                <SelectContent>
                  {availableWidgets.length === 0 ? (
                    <SelectItem value="no-widgets" disabled>
                      No widgets available
                    </SelectItem>
                  ) : (
                    availableWidgets.map((widget) => (
                      <SelectItem key={widget.id} value={widget.id}>
                        {widget.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Widget Playground</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your widget deployments
          </p>
        </div>
      </div>

      {deployment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Deployment Details</CardTitle>
                <CardDescription>Current deployment information</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(deployment.deployment_status)}>
                {deployment.deployment_status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Deployment ID:</span>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{deployment.id}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Type:</span>
                <p className="text-sm">{deployment.deployment_type}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">URL:</span>
                <p className="text-sm">
                  <a 
                    href={deployment.deployment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {deployment.deployment_url}
                  </a>
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <p className="text-sm">{deployment.deployment_status}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Created:</span>
                <p className="text-sm">{formatDate(deployment.created_at)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Updated:</span>
                <p className="text-sm">{formatDate(deployment.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {deployment && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Actions</CardTitle>
            <CardDescription>Manage your widget deployment</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {deployment.deployment_status !== "suspended" && (
              <Button
                variant="outline"
                onClick={() => setShowSuspendDialog(true)}
                disabled={isSuspending || deployment.deployment_status === "deleted"}
              >
                <Pause className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting || deployment.deployment_status === "deleted"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </CardContent>
        </Card>
      )}

      {!deployment && deployments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">No deployments found for this widget.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deployment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend this deployment? The deployment will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={isSuspending}>
              {isSuspending ? "Suspending..." : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WidgetPlayground;

