import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProject } from "@/contexts/ProjectContext";

// Route to label mapping (for non-project-scoped routes)
const routeLabels: Record<string, string> = {
  "/": "Home",
  "/login": "Login",
  "/waitlist": "Waitlist",
};

// Route segment to label mapping (for project-scoped routes)
const projectRouteLabels: Record<string, string> = {
  "toolkits": "Toolkits",
  "widgets": "Widgets",
  "designs": "Designs",
  "create": "Create",
  "edit-ux": "Edit UX",
  "env-variables": "Env Variables",
  "playground": "Playground",
  "mcp": "MCP",
  "evaluate": "Evaluate",
  "deployments": "Deployments",
  "metrics": "Metrics",
  "logs": "Logs",
};

export function PageBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;
  const { projects, selectedProject } = useProject();

  // Get project name by ID
  const getProjectName = (projectId: string): string => {
    // Check if it's the selected project
    if (selectedProject?.id === projectId) {
      return selectedProject.name;
    }
    // Otherwise, find it in the projects list
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId;
  };

  // Generate breadcrumb items
  const generateBreadcrumbs = () => {
    const items: Array<{ label: string; path: string; isActive: boolean }> = [];

    // Always start with Home
    items.push({
      label: "Home",
      path: "/",
      isActive: pathname === "/",
    });

    // Handle different route patterns
    if (pathname === "/") {
      return items;
    }

    // Handle project-scoped routes: /projects/:projectId/...
    const projectRouteMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
    if (projectRouteMatch) {
      const projectId = projectRouteMatch[1];
      const remainingPath = projectRouteMatch[2] || "";

      // Add project breadcrumb with project name (or ID as fallback)
      const projectName = getProjectName(projectId);
      items.push({
        label: projectName,
        path: `/projects/${projectId}`,
        isActive: !remainingPath,
      });

      if (!remainingPath) {
        return items;
      }

      const segments = remainingPath.split("/").filter(Boolean);

      // Handle toolkit detail pages: /projects/:projectId/toolkits/:toolkitId
      if (segments[0] === "toolkits" && segments.length > 1) {
        items.push({
          label: "Toolkits",
          path: `/projects/${projectId}/toolkits`,
          isActive: false,
        });
        items.push({
          label: segments[1] || "Detail",
          path: pathname,
          isActive: true,
        });
        return items;
      }

      // Handle widget create page: /projects/:projectId/widgets/create
      if (segments[0] === "widgets" && segments[1] === "create") {
        items.push({
          label: "Widgets",
          path: `/projects/${projectId}/widgets`,
          isActive: false,
        });
        items.push({
          label: "Create",
          path: pathname,
          isActive: true,
        });
        return items;
      }

      // Handle widget edit pages: /projects/:projectId/widgets/:widgetId/edit-ux
      if (segments[0] === "widgets" && segments.length > 2 && segments[2] === "edit-ux") {
        items.push({
          label: "Widgets",
          path: `/projects/${projectId}/widgets`,
          isActive: false,
        });
        items.push({
          label: segments[1] || "Widget",
          path: pathname,
          isActive: true,
        });
        return items;
      }

      // Handle other project-scoped routes
      segments.forEach((segment, index) => {
        const path = `/projects/${projectId}/` + segments.slice(0, index + 1).join("/");
        const label = projectRouteLabels[segment] || segment;
        items.push({
          label: label,
          path: path,
          isActive: index === segments.length - 1,
        });
      });

      return items;
    }

    // Handle non-project-scoped routes (legacy support)
    // Handle toolkit detail pages: /toolkits/:toolkitId
    if (pathname.startsWith("/toolkits/")) {
      const toolkitId = pathname.split("/toolkits/")[1];
      items.push({
        label: "Toolkit",
        path: "/toolkits",
        isActive: false,
      });
      if (toolkitId && !toolkitId.includes("/")) {
        items.push({
          label: toolkitId,
          path: pathname,
          isActive: true,
        });
      }
      return items;
    }

    // Handle widget create page: /widgets/create
    if (pathname === "/widgets/create") {
      items.push({
        label: "Widgets",
        path: "/widgets",
        isActive: false,
      });
      items.push({
        label: "Create",
        path: pathname,
        isActive: true,
      });
      return items;
    }

    // Handle widget edit pages: /widgets/:widgetId/edit-ux
    if (pathname.startsWith("/widgets/") && pathname.includes("/edit-ux")) {
      const parts = pathname.split("/");
      const widgetId = parts[2];
      items.push({
        label: "Widgets",
        path: "/widgets",
        isActive: false,
      });
      items.push({
        label: widgetId,
        path: pathname,
        isActive: true,
      });
      return items;
    }

    // Handle tool edit pages: /tools/:toolId/edit-ux
    if (pathname.startsWith("/tools/") && pathname.includes("/edit-ux")) {
      const parts = pathname.split("/");
      const toolId = parts[2];
      items.push({
        label: "Tools",
        path: "/tools",
        isActive: false,
      });
      items.push({
        label: toolId,
        path: pathname,
        isActive: true,
      });
      return items;
    }

    // Handle OAuth callback route
    if (pathname === "/oauth/callback") {
      items.push({
        label: "Mcp Server Oauth Callback",
        path: pathname,
        isActive: true,
      });
      return items;
    }

    // Handle other known routes
    const routeLabel = routeLabels[pathname];
    if (routeLabel) {
      items.push({
        label: routeLabel,
        path: pathname,
        isActive: true,
      });
    } else {
      // For unknown routes, use the pathname
      const segments = pathname.split("/").filter(Boolean);
      segments.forEach((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/");
        const label = routeLabels[path] || segment;
        items.push({
          label: label,
          path: path,
          isActive: index === segments.length - 1,
        });
      });
    }

    return items;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center">
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator><span className="mx-1">&gt;</span></BreadcrumbSeparator>}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

