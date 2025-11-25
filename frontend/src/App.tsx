import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import Index from "./pages/Index";
import Toolkits from "./pages/Toolkits";
import Designs from "./pages/Designs";
import EnvVariables from "./pages/EnvVariables";
import Playground from "./pages/Playground";
import MCP from "./pages/MCP";
import Evaluate from "./pages/Evaluate";
import ToolkitDetail from "./pages/ToolkitDetail";
import Widgets from "./pages/Widgets";
import WidgetUxEdit from "./pages/WidgetUxEdit";
import WidgetPlayground from "./pages/WidgetPlayground";
import Metrics from "./pages/Metrics";
import Logs from "./pages/Logs";
import Deployments from "./pages/Deployments";
import CreateWidget from "./pages/CreateWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "14rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1 flex flex-col">
                <header className="sticky top-0 z-10 flex h-12 items-center gap-4 border-b bg-background/80 backdrop-blur-md glass-subtle px-4 lg:h-12 lg:px-6">
                  <SidebarTrigger className="md:hidden" />
                  <div className="flex-1">
                    <PageBreadcrumb />
                  </div>
                  <ThemeToggle />
                </header>
                <div className="flex-1 p-4 lg:p-6">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/toolkits" element={<Toolkits />} />
                    <Route path="/designs" element={<Designs />} />
                    <Route path="/widgets" element={<Widgets />} />
                    <Route path="/widgets/create" element={<CreateWidget />} />
                    <Route path="/toolkits/:toolkitId" element={<ToolkitDetail />} />
                    <Route path="/widgets/:widgetId/edit-ux" element={<WidgetUxEdit />} />
                    <Route path="/widget-playground" element={<WidgetPlayground />} />
                    <Route path="/env-variables" element={<EnvVariables />} />
                    <Route path="/playground" element={<Playground />} />
                    <Route path="/mcp" element={<MCP />} />
                    <Route path="/evaluate" element={<Evaluate />} />
                    <Route path="/deployments" element={<Deployments />} />
                    <Route path="/metrics" element={<Metrics />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
