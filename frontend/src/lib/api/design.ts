import { API_BASE_URL, fetchJson } from "./client";
import { AUTH_TOKEN_KEY } from "@/lib/auth/tokenUtils";

export interface Design {
  id: string;
  created_at: string;
  updated_at?: string;
  design_type: "logo" | "ux_design";
  filename: string;
  content_type: string;
  file_size: number;
}

export interface DesignsListResponse {
  items: Design[];
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

// Helper function to get authenticated fetch options for file uploads
function getAuthenticatedFetchOptions(options: RequestInit = {}): RequestInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {};
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
}

/**
 * Upload a logo design file
 */
export async function uploadLogo(file: File, projectId: string): Promise<Design> {
  const formData = new FormData();
  formData.append('file', file);

  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = `${base}/api/v1/projects/${projectId}/designs/logo`;
  
  console.log('Uploading logo to:', url);
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('File:', { name: file.name, size: file.size, type: file.type });
  
  const response = await fetch(url, getAuthenticatedFetchOptions({
    method: 'POST',
    body: formData,
  }));

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to upload logo (${response.status} ${response.statusText})`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.detail || error.message || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    console.error('Upload logo failed:', { url, status: response.status, statusText: response.statusText, errorMessage });
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Upload a UX design file (Figma files, screenshots, etc.)
 */
export async function uploadUxDesign(file: File, projectId: string): Promise<Design> {
  const formData = new FormData();
  formData.append('file', file);

  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = `${base}/api/v1/projects/${projectId}/designs/ux-design`;
  
  console.log('Uploading UX design to:', url);
  console.log('File:', { name: file.name, size: file.size, type: file.type });
  
  const response = await fetch(url, getAuthenticatedFetchOptions({
    method: 'POST',
    body: formData,
  }));

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to upload UX design (${response.status} ${response.statusText})`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.detail || error.message || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    console.error('Upload UX design failed:', { url, status: response.status, statusText: response.statusText, errorMessage });
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * List all designs with optional filtering by type
 */
export async function listDesigns(designType: "logo" | "ux_design" | undefined, projectId: string): Promise<DesignsListResponse> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });
  if (designType) {
    params.append('design_type', designType);
  }

  return fetchJson<DesignsListResponse>(`/api/v1/projects/${projectId}/designs?${params.toString()}`);
}

/**
 * Get metadata for a specific design
 */
export async function getDesign(designId: string, projectId: string): Promise<Design> {
  return fetchJson<Design>(`/api/v1/projects/${projectId}/designs/${designId}`);
}

/**
 * Delete a design
 */
export async function deleteDesign(designId: string, projectId: string): Promise<void> {
  return fetchJson<void>(`/api/v1/projects/${projectId}/designs/${designId}`, {
    method: 'DELETE',
  });
}

/**
 * Download a design file
 */
export async function downloadDesign(designId: string, filename: string, projectId: string): Promise<void> {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const url = `${base}/api/v1/projects/${projectId}/designs/${designId}/download`;
  
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to download design (${response.status} ${response.statusText})`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.detail || error.message || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const urlObj = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = urlObj;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(urlObj);
  document.body.removeChild(a);
}


