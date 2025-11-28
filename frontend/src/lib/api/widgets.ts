import { API_BASE_URL, fetchJson } from "./client";
import { AUTH_TOKEN_KEY } from "@/lib/auth/tokenUtils";

export interface WidgetListResponse {
    id: string;
    name: string;
    description: string;
    created_at: string | null;
    tool_ids: string[];
}

export interface WidgetResponse {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    name: string;
    description: string;
    ui_widget_resource_id: string | null;
    tool_ids: string[];
}

export interface WidgetListPaginatedResponse {
    items: WidgetListResponse[];
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface WidgetCreate {
    name: string;
    description: string;
    tool_ids: string[];
    create_prompt: string;
}

export interface WidgetCreateResponse {
    status: "ok";
}

export interface WidgetUpdate {
    name?: string | null;
    description?: string | null;
    tool_ids?: string[] | null;
}

export interface UiWidgetResourceResponse {
    id: string;
    widget_id: string;
    created_at: string | null;
    updated_at: string | null;
    resource: Record<string, unknown>;
}


export async function listWidgets(projectId: string, limit = 20, offset = 0): Promise<WidgetListPaginatedResponse> {
    const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
    });
    return fetchJson<WidgetListPaginatedResponse>(`/api/v1/projects/${projectId}/widgets?${params.toString()}`);
}

export async function createWidget(widgetData: WidgetCreate, projectId: string): Promise<WidgetCreateResponse> {
    return fetchJson<WidgetCreateResponse>(`/api/v1/projects/${projectId}/widgets`, {
        method: "POST",
        body: JSON.stringify(widgetData),
    });
}

export async function getWidget(widgetId: string, projectId: string): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/projects/${projectId}/widgets/${widgetId}`);
}

export async function updateWidget(widgetId: string, widgetData: WidgetUpdate, projectId: string): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/projects/${projectId}/widgets/${widgetId}`, {
        method: "PATCH",
        body: JSON.stringify(widgetData),
    });
}

export async function deleteWidget(widgetId: string, projectId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/widgets/${widgetId}`, {
        method: "DELETE",
    });
}

export async function getUiWidgetResource(resourceId: string, projectId: string): Promise<UiWidgetResourceResponse> {
    return fetchJson<UiWidgetResourceResponse>(`/api/v1/projects/${projectId}/ui-widget-resources/${resourceId}`);
}


export interface SetWidgetResourceRequest {
    ui_widget_resource_id: string;
}

export async function setWidgetResource(widgetId: string, resourceId: string, projectId: string): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/projects/${projectId}/widgets/${widgetId}/set-resource`, {
        method: "POST",
        body: JSON.stringify({
            ui_widget_resource_id: resourceId,
        } as SetWidgetResourceRequest),
    });
}


export interface WidgetDeploymentArchive {
    blob: Blob;
    filename: string;
    deploymentType: string | null;
}

const DEPLOYMENT_DOWNLOAD_HEADER = "content-disposition";
const DEPLOYMENT_TYPE_HEADER = "x-widget-deployment-type";

const getFilenameFromDisposition = (disposition: string | null, fallback: string): string => {
    if (!disposition) {
        return fallback;
    }

    const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (filenameStarMatch?.[1]) {
        try {
            return decodeURIComponent(filenameStarMatch[1]);
        } catch {
            return filenameStarMatch[1];
        }
    }

    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (filenameMatch?.[1]) {
        return filenameMatch[1];
    }

    return fallback;
};

export async function downloadWidgetDeploymentArchive(widgetId: string, projectId: string): Promise<WidgetDeploymentArchive> {
    const base = API_BASE_URL.replace(/\/+$/, "");
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    const response = await fetch(`${base}/api/v1/projects/${projectId}/widgets/${widgetId}/deployments`, {
        method: "POST",
        headers: {
            Accept: "application/zip",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Failed to generate widget deployment bundle");
    }

    const blob = await response.blob();
    const filename = getFilenameFromDisposition(
        response.headers.get(DEPLOYMENT_DOWNLOAD_HEADER),
        `${widgetId}-deployment.zip`
    );
    const deploymentType = response.headers.get(DEPLOYMENT_TYPE_HEADER);

    return { blob, filename, deploymentType };
}