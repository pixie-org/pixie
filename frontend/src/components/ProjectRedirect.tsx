import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";

export function ProjectRedirect() {
  const { selectedProject, projects, isLoading } = useProject();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      // If we have a selected project, navigate to it
      if (selectedProject) {
        navigate(`/projects/${selectedProject.id}`, { replace: true });
      } 
      // If we have projects but no selected project, use the first one
      else if (projects.length > 0) {
        navigate(`/projects/${projects[0].id}`, { replace: true });
      }
      // Otherwise, no projects available - stay on current page (error will be shown below)
    }
  }, [selectedProject, projects, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If we have a selected project, navigate to it
  if (selectedProject) {
    return <Navigate to={`/projects/${selectedProject.id}`} replace />;
  }

  // If we have projects but no selected project, use the first one
  if (projects.length > 0) {
    return <Navigate to={`/projects/${projects[0].id}`} replace />;
  }

  // No projects available
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">No projects available. Please create a project first.</p>
      </div>
    </div>
  );
}

