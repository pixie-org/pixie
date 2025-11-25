import { API_BASE_URL, fetchJson } from "./client";

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

export interface WidgetDeploymentResponse {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    widget_id: string;
    deployment_type: "local";
    deployment_url: string;
    deployment_status: "active" | "deploying" | "suspended" | "error" | "deleted";
}

export interface WidgetDeploymentListResponse {
    id: string;
    widget_id: string;
    deployment_type: "local";
    deployment_status: "active" | "deploying" | "suspended" | "error" | "deleted";
    created_at: string | null;
}

export async function listWidgets(limit = 20, offset = 0): Promise<WidgetListPaginatedResponse> {
    const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
    });
    return fetchJson<WidgetListPaginatedResponse>(`/api/v1/widgets?${params.toString()}`);
}

export async function createWidget(widgetData: WidgetCreate): Promise<WidgetCreateResponse> {
    return fetchJson<WidgetCreateResponse>(`/api/v1/widgets`, {
        method: "POST",
        body: JSON.stringify(widgetData),
    });
}

export async function getWidget(widgetId: string): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/widgets/${widgetId}`);
}

export async function updateWidget(widgetId: string, widgetData: WidgetUpdate): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/widgets/${widgetId}`, {
        method: "PATCH",
        body: JSON.stringify(widgetData),
    });
}

export async function deleteWidget(widgetId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/widgets/${widgetId}`, {
        method: "DELETE",
    });
}

export async function getUiWidgetResource(resourceId: string): Promise<UiWidgetResourceResponse> {
    return fetchJson<UiWidgetResourceResponse>(`/api/v1/ui-widget-resources/${resourceId}`);
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

export interface WidgetDeploymentArchive {
    blob: Blob;
    filename: string;
    deploymentType: string | null;
}

export async function downloadWidgetDeploymentArchive(widgetId: string): Promise<WidgetDeploymentArchive> {
    const base = API_BASE_URL.replace(/\/+$/, "");
    const response = await fetch(`${base}/api/v1/widgets/${widgetId}/deployments`, {
        method: "POST",
        headers: {
            Accept: "application/zip",
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

export async function listWidgetDeployments(widgetId: string): Promise<WidgetDeploymentListResponse[]> {
    return fetchJson<WidgetDeploymentListResponse[]>(`/api/v1/widgets/${widgetId}/deployments`);
}

export async function getWidgetDeployment(deploymentId: string): Promise<WidgetDeploymentResponse> {
    return fetchJson<WidgetDeploymentResponse>(`/api/v1/widget-deployments/${deploymentId}`);
}

export async function deleteWidgetDeployment(deploymentId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/widget-deployments/${deploymentId}`, {
        method: "DELETE",
    });
}

export async function suspendWidgetDeployment(deploymentId: string): Promise<WidgetDeploymentResponse> {
    return fetchJson<WidgetDeploymentResponse>(`/api/v1/widget-deployments/${deploymentId}/suspend`, {
        method: "POST",
    });
}

export interface SetWidgetResourceRequest {
    ui_widget_resource_id: string;
}

export async function setWidgetResource(widgetId: string, resourceId: string): Promise<WidgetResponse> {
    return fetchJson<WidgetResponse>(`/api/v1/widgets/${widgetId}/set-resource`, {
        method: "POST",
        body: JSON.stringify({
            ui_widget_resource_id: resourceId,
        } as SetWidgetResourceRequest),
    });
}

// MCP Tool Call API Types and Functions
export interface McpToolCallRequest {
    tool_name: string;
    tool_params: Record<string, unknown>;
}

export interface McpToolCallResult {
    content: string[];
    structuredContent: Record<string, unknown>;
    isError: boolean;
}

export interface McpToolCallResponse {
    tool_name: string;
    tool_params: Record<string, unknown>;
    result: McpToolCallResult | null;
    error: string | null;
}

export async function callMcpToolViaDeployment(
    deploymentId: string,
    toolName: string,
    toolParams: Record<string, unknown> = {}
): Promise<McpToolCallResult> {
    const response = await fetchJson<McpToolCallResponse>(`/api/v1/mcp-tool-call/deployment/${deploymentId}`, {
        method: "POST",
        body: JSON.stringify({
            tool_name: toolName,
            tool_params: toolParams,
        } as McpToolCallRequest),
    });
    return response.result || {
        content: [],
        structuredContent: {},
        isError: false,
    };
}

export async function callMcpToolViaWidget(
    widgetId: string,
    toolName: string,
    toolParams: Record<string, unknown> = {}
): Promise<McpToolCallResult> {
    const response = await fetchJson<McpToolCallResponse>(`/api/v1/mcp-tool-call/widget/${widgetId}`, {
        method: "POST",
        body: JSON.stringify({
            tool_name: toolName,
            tool_params: toolParams,
        } as McpToolCallRequest),
    });
    return response.result || {
        content: [],
        structuredContent: {},
        isError: false,
    };
}
