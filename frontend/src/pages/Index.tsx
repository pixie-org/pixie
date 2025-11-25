import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Sparkles, ArrowRight, Download, Plus } from "lucide-react";
import { listTools } from "@/lib/api/tools";
import { listWidgets } from "@/lib/api/widgets";
import { DEFAULT_PROJECT_ID } from "@/lib/api/client";

const Index = () => {
  const navigate = useNavigate();
  const [hasTools, setHasTools] = useState<boolean | null>(null);
  const [hasWidgets, setHasWidgets] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkData = async () => {
      try {
        setIsLoading(true);
        // Check if tools exist
        const tools = await listTools(DEFAULT_PROJECT_ID);
        setHasTools(tools.length > 0);

        // Check if widgets exist
        const widgetsResponse = await listWidgets(1, 0);
        setHasWidgets(widgetsResponse.total > 0);
      } catch (error) {
        console.error("Failed to check tools and widgets:", error);
        setHasTools(false);
        setHasWidgets(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkData();
  }, []);

  const handleImportTool = () => {
    navigate("/toolkits");
  };

  const handleCreateWidget = () => {
    navigate("/widgets/create");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="space-y-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Welcome to Pixie
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Create MCP apps easily
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Tools Button */}
        <Card className="flex-1 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
          <Link to="/toolkits" className="block h-full">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Tools</CardTitle>
              <CardDescription className="text-base mt-2">
                Manage and import your tools
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Button size="lg" className="w-full group-hover:bg-primary/90">
                View Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isLoading && !hasTools && (
                <div className="w-full mt-2">
                  <Card className="bg-muted/50 border-dashed">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Download className="h-4 w-4" />
                        <span>Import your first tool</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 hover:bg-accent/10 hover:text-foreground hover:border-primary/60"
                        onClick={(e) => {
                          e.preventDefault();
                          handleImportTool();
                        }}
                      >
                        Import Tool
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Link>
        </Card>

        {/* Widgets Button */}
        <Card className="flex-1 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
          <Link to="/widgets" className="block h-full">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Sparkles className="h-8 w-8 text-accent" />
                </div>
              </div>
              <CardTitle className="text-2xl">Widgets</CardTitle>
              <CardDescription className="text-base mt-2">
                Create and manage your widgets
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Button size="lg" className="w-full bg-accent/90 group-hover:bg-accent/80">
                View Widgets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isLoading && !hasWidgets && (
                <div className="w-full mt-2">
                  <Card className="bg-muted/50 border-dashed">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        <span>Create your first widget</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 hover:bg-accent/10 hover:text-foreground hover:border-primary/60"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCreateWidget();
                        }}
                      >
                        Create Widget
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default Index;
