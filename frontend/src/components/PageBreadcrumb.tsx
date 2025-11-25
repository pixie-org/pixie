import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route to label mapping
const routeLabels: Record<string, string> = {
  "/": "Home",
  "/toolkits": "Tools",
  "/designs": "Designs",
  "/widgets": "Widgets",
  "/widgets/create": "Create",
  "/toolkit-sources": "Toolkit Sources",
  "/create-tool-source": "Create Tool Source",
  "/env-variables": "Environments",
  "/widget-playground": "Playground",
  "/evaluate": "Evaluations",
  "/deployments": "Deployments",
  "/metrics": "Metrics",
  "/logs": "Logs",
  "/playground": "Playground",
  "/tools": "Tools",
  "/custom-widget": "Custom Widget",
};

export function PageBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

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

