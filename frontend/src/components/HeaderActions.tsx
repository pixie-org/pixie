import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LayoutDashboard } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface HeaderActionsProps {
  isUserSignedIn: boolean;
}

export function HeaderActions({ isUserSignedIn }: HeaderActionsProps) {
  const navigate = useNavigate();
  const { selectedProject, projects } = useProject();

  return (
    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
      <ThemeToggle />
      <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
      <a
        href="https://discord.gg/RaH6jBzA"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        aria-label="Discord"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"></path>
        </svg>
      </a>
      <a
        href="https://github.com/pixie-org/pixie"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        aria-label="GitHub"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.305.762-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.49 11.49 0 0 1 6 0c2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
        </svg>
      </a>
      <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
      <a
        href="https://x.com/trypixieapp"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        aria-label="X (Twitter)"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
        </svg>
      </a>
      {!isUserSignedIn && (
        <>
          <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate("/login")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <User className="mr-2 h-4 w-4" />
            Login
          </Button>
        </>
      )}
      {isUserSignedIn && (
        <>
          <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              // Navigate to selected project or first project, or root which will redirect
              if (selectedProject) {
                navigate(`/projects/${selectedProject.id}`);
              } else if (projects.length > 0) {
                navigate(`/projects/${projects[0].id}`);
              } else {
                navigate("/");
              }
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </>
      )}
    </div>
  );
}

