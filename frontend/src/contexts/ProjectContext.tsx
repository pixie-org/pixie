import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { listProjects, Project } from "@/lib/api/projects";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectContextType {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  setSelectedProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
  getCurrentProjectId: () => string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const PROJECT_STORAGE_KEY = "pixie_selected_project_id";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    // Don't load projects if user is not authenticated
    if (!user || !token) {
      setProjects([]);
      setSelectedProjectState(null);
      setIsLoading(false);
      return;
    }

    // Helper function to select default project based on count
    const selectDefaultProject = (projectsData: Project[]) => {
      // If user only has one project, select that by default
      if (projectsData.length === 1) {
        setSelectedProjectState(projectsData[0]);
        localStorage.setItem(PROJECT_STORAGE_KEY, projectsData[0].id);
      } else {
        // Otherwise, select the first one in the list
        setSelectedProjectState(projectsData[0]);
        localStorage.setItem(PROJECT_STORAGE_KEY, projectsData[0].id);
      }
    };

    try {
      setIsLoading(true);
      const projectsData = await listProjects();
      setProjects(projectsData);
      
      if (projectsData.length === 0) {
        setSelectedProjectState(null);
      } else {
        // Restore selected project from localStorage
        const savedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (savedProjectId) {
          const savedProject = projectsData.find(p => p.id === savedProjectId);
          if (savedProject) {
            // Found saved project in the list, select it
            setSelectedProjectState(savedProject);
          } else {
            // Saved project not found, use default selection logic
            selectDefaultProject(projectsData);
          }
        } else {
          // No saved project, use default selection logic
          selectDefaultProject(projectsData);
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
      setSelectedProjectState(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project);
    if (project) {
      localStorage.setItem(PROJECT_STORAGE_KEY, project.id);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  };

  // Load projects when user or token changes
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const getCurrentProjectId = useCallback((): string => {
    if (!selectedProject) {
      if (projects.length === 0) {
        throw new Error("No projects available. Please create a project first.");
      }
      // Return first project if none selected
      return projects[0].id;
    }
    return selectedProject.id;
  }, [selectedProject, projects]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isLoading,
        setSelectedProject,
        refreshProjects: loadProjects,
        getCurrentProjectId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

