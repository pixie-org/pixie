import { useProject } from "@/contexts/ProjectContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function ProjectSelector() {
  const { projects, selectedProject, isLoading, setSelectedProject } = useProject();
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No projects available
      </div>
    );
  }

  return (
    <Select
      value={selectedProject?.id || ""}
      onValueChange={(value) => {
        const project = projects.find((p) => p.id === value);
        if (project) {
          setSelectedProject(project);
          // Navigate to the same route but with new project ID
          const currentPath = window.location.pathname;
          const newPath = currentPath.replace(`/projects/${urlProjectId || ''}`, `/projects/${project.id}`);
          navigate(newPath);
        }
      }}
    >
      <SelectTrigger className="w-[200px]">
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
  );
}

