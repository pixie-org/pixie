import { NavLink, useLocation } from "react-router-dom";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const createItems = [
  { title: "Tools", url: "/toolkits", icon: Package },
  { title: "Designs", url: "/designs", icon: Palette },
  { title: "Environments", url: "/env-variables", icon: Settings },
];

const designItems = [
  { title: "Widgets", url: "/widgets", icon: BarChart3 },
];

const evaluateItems = [
  { title: "Playground", url: "/playground", icon: Play },
  { title: "Evaluations", url: "/evaluate", icon: ClipboardCheck },
];

const deployItems = [
  { title: "Deployments", url: "/deployments", icon: Upload },
  { title: "Metrics", url: "/metrics", icon: BarChart },
  { title: "Logs", url: "/logs", icon: FileSearch },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();

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
              <NavLink to="/" className="flex items-center gap-2">
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
    </Sidebar>
  );
}