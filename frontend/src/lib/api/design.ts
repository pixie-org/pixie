import { API_BASE_URL } from "./client";

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

// Helper function to normalize API URL
function getApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

// Helper function to parse error responses
async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  let errorMessage = `${defaultMessage} (${response.status} ${response.statusText})`;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      errorMessage = error.detail || error.message || errorMessage;
    } else {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
  } catch (e) {
    console.error('Error parsing response:', e);
  }
  return errorMessage;
}

/**
 * Upload a logo design file
 */
export async function uploadLogo(file: File): Promise<Design> {
  const formData = new FormData();
  formData.append('file', file);

  const url = getApiUrl('/api/v1/designs/logo');
  
  console.log('Uploading logo to:', url);
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('File:', { name: file.name, size: file.size, type: file.type });
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to upload logo');
    console.error('Upload logo failed:', { url, status: response.status, statusText: response.statusText, errorMessage });
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Upload a UX design file (Figma files, screenshots, etc.)
 */
export async function uploadUxDesign(file: File): Promise<Design> {
  const formData = new FormData();
  formData.append('file', file);

  const url = getApiUrl('/api/v1/designs/ux-design');
  
  console.log('Uploading UX design to:', url);
  console.log('File:', { name: file.name, size: file.size, type: file.type });
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to upload UX design');
    console.error('Upload UX design failed:', { url, status: response.status, statusText: response.statusText, errorMessage });
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * List all designs with optional filtering by type
 */
export async function listDesigns(designType?: "logo" | "ux_design"): Promise<DesignsListResponse> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });
  if (designType) {
    params.append('design_type', designType);
  }

  const url = getApiUrl(`/api/v1/designs?${params}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to fetch designs');
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Get metadata for a specific design
 */
export async function getDesign(designId: string): Promise<Design> {
  const url = getApiUrl(`/api/v1/designs/${designId}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to fetch design');
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Delete a design
 */
export async function deleteDesign(designId: string): Promise<void> {
  const url = getApiUrl(`/api/v1/designs/${designId}`);
  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to delete design');
    throw new Error(errorMessage);
  }
}

/**
 * Download a design file
 */
export async function downloadDesign(designId: string, filename: string): Promise<void> {
  const url = getApiUrl(`/api/v1/designs/${designId}/download`);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, 'Failed to download design');
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


