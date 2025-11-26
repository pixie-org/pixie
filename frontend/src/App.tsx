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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProjectRedirect } from "@/components/ProjectRedirect";
import AuthCallback from "@/pages/AuthCallback";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Waitlist from "@/pages/Waitlist";
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
import Metrics from "./pages/Metrics";
import Logs from "./pages/Logs";
import Deployments from "./pages/Deployments";
import CreateWidget from "./pages/CreateWidget";

const queryClient = new QueryClient();

function AppContent() {
  const { user, isLoading, guestModeEnabled } = useAuth();

  // If guest mode is enabled, show app directly (guest user is auto-set)
  if (guestModeEnabled) {
    return (
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
                <Route path="/" element={<ProjectRedirect />} />
                <Route path="/projects/:projectId" element={<Index />} />
                <Route path="/projects/:projectId/toolkits" element={<Toolkits />} />
                <Route path="/projects/:projectId/designs" element={<Designs />} />
                <Route path="/projects/:projectId/widgets" element={<Widgets />} />
                <Route path="/projects/:projectId/widgets/create" element={<CreateWidget />} />
                <Route path="/projects/:projectId/toolkits/:toolkitId" element={<ToolkitDetail />} />
                <Route path="/projects/:projectId/widgets/:widgetId/edit-ux" element={<WidgetUxEdit />} />
                <Route path="/projects/:projectId/env-variables" element={<EnvVariables />} />
                <Route path="/projects/:projectId/playground" element={<Playground />} />
                <Route path="/projects/:projectId/mcp" element={<MCP />} />
                <Route path="/projects/:projectId/evaluate" element={<Evaluate />} />
                <Route path="/projects/:projectId/deployments" element={<Deployments />} />
                <Route path="/projects/:projectId/metrics" element={<Metrics />} />
                <Route path="/projects/:projectId/logs" element={<Logs />} />
                <Route path="*" element={<ProjectRedirect />} />
              </Routes>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Production mode: Show landing page if not logged in
  if (!isLoading && !user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Production mode: Show waitlist page if user is waitlisted
  if (!isLoading && user && user.waitlisted) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Waitlist />} />
      </Routes>
    );
  }

  // Show nothing while loading to prevent sidebar flash
  if (isLoading) {
    return null;
  }

  // Production mode: Show main app if logged in and not waitlisted
  return (
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
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/projects/:projectId/toolkits" element={<ProtectedRoute><Toolkits /></ProtectedRoute>} />
              <Route path="/projects/:projectId/designs" element={<ProtectedRoute><Designs /></ProtectedRoute>} />
              <Route path="/projects/:projectId/widgets" element={<ProtectedRoute><Widgets /></ProtectedRoute>} />
              <Route path="/projects/:projectId/widgets/create" element={<ProtectedRoute><CreateWidget /></ProtectedRoute>} />
              <Route path="/projects/:projectId/toolkits/:toolkitId" element={<ProtectedRoute><ToolkitDetail /></ProtectedRoute>} />
              <Route path="/projects/:projectId/widgets/:widgetId/edit-ux" element={<ProtectedRoute><WidgetUxEdit /></ProtectedRoute>} />
              <Route path="/projects/:projectId/env-variables" element={<ProtectedRoute><EnvVariables /></ProtectedRoute>} />
              <Route path="/projects/:projectId/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />
              <Route path="/projects/:projectId/mcp" element={<ProtectedRoute><MCP /></ProtectedRoute>} />
              <Route path="/projects/:projectId/evaluate" element={<ProtectedRoute><Evaluate /></ProtectedRoute>} />
              <Route path="/projects/:projectId/deployments" element={<ProtectedRoute><Deployments /></ProtectedRoute>} />
              <Route path="/projects/:projectId/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
              <Route path="/projects/:projectId/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><ProjectRedirect /></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><ProjectRedirect /></ProtectedRoute>} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
              <AppContent />
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
