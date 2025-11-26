import { fetchJson } from "./client";

export interface Project {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  name: string;
  description: string | null;
  owner_id: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
}

export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
}

export interface ProjectListResponse {
  projects: Project[];
}

export async function listProjects(): Promise<Project[]> {
  const response = await fetchJson<ProjectListResponse>(`/api/v1/projects`);
  return response.projects;
}

export async function getProject(projectId: string): Promise<Project> {
  return fetchJson<Project>(`/api/v1/projects/${projectId}`);
}

export async function createProject(projectData: ProjectCreate): Promise<Project> {
  return fetchJson<Project>(`/api/v1/projects`, {
    method: "POST",
    body: JSON.stringify(projectData),
  });
}

export async function updateProject(projectId: string, projectData: ProjectUpdate): Promise<Project> {
  return fetchJson<Project>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(projectData),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  return fetchJson<void>(`/api/v1/projects/${projectId}`, {
    method: "DELETE",
  });
}


