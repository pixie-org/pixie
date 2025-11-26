import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Sparkles,
  ClipboardCheck,
  Rocket,
  Package,
  Network,
  BarChart3,
  Layout,
  Settings,
  Play,
  Upload,
  BarChart,
  FileSearch,
  Palette,
  Download
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Plus, Folder } from "lucide-react";
import { useState } from "react";
import { createProject } from "@/lib/api/projects";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { selectedProject } = useProject();

  const currentProjectId = projectId || selectedProject?.id || '';
  const projectPrefix = currentProjectId ? `/projects/${currentProjectId}` : '';

  const createItems = [
    { title: "Tools", url: `${projectPrefix}/toolkits`, icon: Package },
    { title: "Designs", url: `${projectPrefix}/designs`, icon: Palette },
    { title: "Environments", url: `${projectPrefix}/env-variables`, icon: Settings },
  ];

  const designItems = [
    { title: "Widgets", url: `${projectPrefix}/widgets`, icon: BarChart3 },
  ];

  const evaluateItems = [
    { title: "Playground", url: `${projectPrefix}/playground`, icon: Play },
    { title: "Evaluations", url: `${projectPrefix}/evaluate`, icon: ClipboardCheck },
  ];

  const deployItems = [
    { title: "Deployments", url: `${projectPrefix}/deployments`, icon: Upload },
    { title: "Metrics", url: `${projectPrefix}/metrics`, icon: BarChart },
    { title: "Logs", url: `${projectPrefix}/logs`, icon: FileSearch },
  ];

  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(path + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={`border-b border-sidebar-border/30 py-3 ${isCollapsed ? "px-0" : "px-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="group relative flex items-center justify-center h-6 w-6 transition-all"
              aria-label="Toggle Sidebar"
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-6 w-6 group-hover:opacity-0 transition-opacity image-shadow rounded-lg" 
              />
              <SidebarTrigger className="absolute h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          ) : (
            <>
              <NavLink to={currentProjectId ? `/projects/${currentProjectId}` : '/'} className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-7 w-7 image-shadow rounded-lg" />
                {/* <span className="text-base font-semibold text-sidebar-foreground">
                  Pixie
                </span> */}
              </NavLink>
              <SidebarTrigger className="h-5 w-5" />
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Download className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                Create
              </TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {createItems.map((item) => {
                const isActive = isPathActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      >
                        <item.icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} text-current`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="border-t border-sidebar-border my-3 mx-2" />

        <SidebarGroup>
          <SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Sparkles className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                Design
              </TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {designItems.map((item) => {
                const isActive = isPathActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      >
                        <item.icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} text-current`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="border-t border-sidebar-border my-3 mx-2" />
        <SidebarGroup>
          <SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ClipboardCheck className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                Evaluate
              </TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {evaluateItems.map((item) => {
                const isActive = isPathActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      >
                        <item.icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} text-current`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="border-t border-sidebar-border my-3 mx-2" />

        <SidebarGroup>
          <SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Rocket className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                Deploy
              </TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {deployItems.map((item) => {
                const isActive = isPathActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      >
                        <item.icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} text-current`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarAuthButton />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarAuthButton() {
  const { user, isLoading, login, logout, guestModeEnabled } = useAuth();
  const { projects, selectedProject, isLoading: projectsLoading, setSelectedProject, refreshProjects } = useProject();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const project = await createProject({ name: newProjectName.trim() });
      await refreshProjects();
      setSelectedProject(project);
      setCreateProjectOpen(false);
      setNewProjectName("");
      toast({
        title: "Success",
        description: `Project "${project.name}" created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarMenuButton disabled className="w-full">
        <div className="h-4 w-4 animate-pulse rounded bg-sidebar-accent" />
        {!isCollapsed && <span>Loading...</span>}
      </SidebarMenuButton>
    );
  }

  if (user) {
    const initials = user.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : user.email[0].toUpperCase();

    return (
      <>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className={`w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${isCollapsed ? "justify-center" : ""}`}>
                  <Avatar className="h-11 w-11 transition-transform hover:scale-110">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email} />
                    <AvatarFallback className="text-base font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-medium truncate w-full">
                        {user.name || user.email}
                      </span>
                      <span className="text-xs text-sidebar-foreground/70 truncate w-full">
                        {user.email}
                      </span>
                    </div>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" align="center">
                <div className="flex flex-col">
                  <span className="font-medium">{user.name || "User"}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 px-2">Project</div>
              {projectsLoading ? (
                <div className="text-xs text-muted-foreground px-2">Loading projects...</div>
              ) : projects.length > 0 ? (
                <Select
                  value={selectedProject?.id || ""}
                  onValueChange={(value) => {
                    const project = projects.find((p) => p.id === value);
                    if (project) {
                      setSelectedProject(project);
                      const currentPath = `/projects/${project.id}`;
                      navigate(currentPath);
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-muted-foreground px-2">No projects</div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Project
            </DropdownMenuItem>
            {!guestModeEnabled && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project workspace to organize your tools and widgets.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-sm font-medium">
                  Project Name
                </label>
                <Input
                  id="project-name"
                  placeholder="My Project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) {
                      handleCreateProject();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateProjectOpen(false);
                  setNewProjectName("");
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full">
              <LogIn className="h-4 w-4" />
              {!isCollapsed && <span>Login</span>}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right" align="center">
            Login
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuItem onClick={() => login("google")}>
          <User className="mr-2 h-4 w-4" />
          Login with Google
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => login("github")}>
          <User className="mr-2 h-4 w-4" />
          Login with GitHub
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}