import { fetchJson, APIEndpointConfiguration, MCPClientConfiguration } from "./client";
import type { Tool, EndpointType, MCPEndpointConfig, APIEndpointConfig } from "@/components/ToolsList";

export interface ToolCreate {
    project_id?: string | null;
    tool_name: string;
    tool_description: string;
    tool_type: string;
    status?: string;
    api_endpoint_configuration?: APIEndpointConfiguration | null;
    mcp_client_configuration?: MCPClientConfiguration | null;
    ui_resource?: unknown;
    tool_input_schema?: Record<string, unknown> | null;
    tool_output_schema?: Record<string, unknown> | null;
}

export interface ToolUpdate {
    tool_name?: string | null;
    tool_description?: string | null;
    status?: string | null;
    use_temporary_ui_resource?: boolean;
}

export interface ToolListResponse {
    tool_id: string;
    project_id: string;
    tool_name: string;
    tool_description: string;
    tool_type: string;
    status: string;
}

export interface ToolResponse {
    project_id: string;
    tool_name: string;
    tool_description: string;
    tool_type: string;
    status: string;
    api_endpoint_configuration?: APIEndpointConfiguration | null;
    mcp_client_configuration?: MCPClientConfiguration | null;
    ui_resource?: unknown;
    temporary_ui_resource?: unknown;
    tool_input_schema?: Record<string, unknown> | null;
    tool_output_schema?: Record<string, unknown> | null;
    tool_id: string;
}

export interface ToolDetailResponse {
    id: string;
    toolkit_id: string;
    created_at: string | null;
    updated_at: string | null;
    name: string;
    title: string | null;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown> | null;
    annotations: Record<string, unknown> | null;
    is_enabled: boolean;
}

export interface ToolkitSource {
    id: string;
    name: string;
    description: string;
    type: string;
    [key: string]: unknown;
}

export interface ToolkitSourceDetail {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    source_type: string;
    description: string;
    configuration: {
        server_url?: string | null;
        transport?: string | null;
        credentials?: Record<string, unknown> | null;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface ToolkitSourceCreate {
    name: string;
    source_type: string;
    description: string;
    configuration: {
        transport?: string;
        server_url?: string;
        credentials?: Record<string, unknown> | null;
        [key: string]: unknown;
    };
}

export interface Toolkit {
    id: string;
    name: string;
    description?: string;
    [key: string]: unknown;
}

export interface ToolkitCreate {
    name: string;
    toolkit_source_id: string;
    description?: string;
}

export interface ToolkitDetail {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    name: string;
    toolkit_source_id: string;
    toolkit_source: ToolkitSourceDetail;
    [key: string]: unknown;
}


// Re-export Tool types from ToolsList for consistency
export type { Tool, EndpointType, MCPEndpointConfig, APIEndpointConfig };

// Converter functions
export function convertToolListToTool(toolListResponse: ToolListResponse): Tool {
    return {
        id: toolListResponse.tool_id,
        toolId: toolListResponse.tool_id,
        name: toolListResponse.tool_name,
        description: toolListResponse.tool_description,
        endpointType: toolListResponse.tool_type as EndpointType,
        endpointConfig: {} as MCPEndpointConfig | APIEndpointConfig, // Will be populated when full details are fetched
        status: toolListResponse.status as "active" | "disabled",
        type: toolListResponse.tool_type as EndpointType,
    };
}

export function convertToolResponseToTool(toolResponse: ToolResponse): Tool {
    // Properly type the endpoint config based on tool type
    let endpointConfig: MCPEndpointConfig | APIEndpointConfig;

    if (toolResponse.mcp_client_configuration) {
        // Convert MCP config to MCPEndpointConfig
        const mcpConfig = toolResponse.mcp_client_configuration;
        endpointConfig = {
            transportType: mcpConfig.transport ?? "stdio",
            url: mcpConfig.server_url ?? "",
            connectionType: "direct",
        } as MCPEndpointConfig;
    } else if (toolResponse.api_endpoint_configuration) {
        // Convert API config to APIEndpointConfig
        const apiConfig = toolResponse.api_endpoint_configuration;
        endpointConfig = {
            endpoint: apiConfig.url ?? "",
            method: apiConfig.method ?? "GET",
            timeout: apiConfig.timeout ?? undefined,
            headers: {},
        } as APIEndpointConfig;
    } else {
        // Default empty config
        endpointConfig = {} as MCPEndpointConfig | APIEndpointConfig;
    }

    return {
        id: toolResponse.tool_id,
        toolId: toolResponse.tool_id,
        name: toolResponse.tool_name,
        description: toolResponse.tool_description,
        endpointType: toolResponse.tool_type as EndpointType,
        endpointConfig,
        status: toolResponse.status as "active" | "disabled",
        type: toolResponse.tool_type as EndpointType,
        inputSchema: toolResponse.tool_input_schema,
        outputSchema: toolResponse.tool_output_schema,
    };
}

export function convertToolToToolCreate(tool: Tool): ToolCreate {
    // Determine which configuration to use based on endpoint type
    const isApiType = tool.endpointType === "api" || tool.endpointType === "webhook";
    const isMcpType = tool.endpointType === "mcp";

    return {
        tool_name: tool.name,
        tool_description: tool.description,
        tool_type: tool.endpointType,
        status: tool.status,
        api_endpoint_configuration: isApiType ? (tool.endpointConfig as APIEndpointConfiguration) : null,
        mcp_client_configuration: isMcpType ? (tool.endpointConfig as MCPClientConfiguration) : null,
        tool_input_schema: tool.inputSchema ?? null,
        tool_output_schema: tool.outputSchema ?? null,
    };
}

// --- Tools ---


export async function listTools(projectId: string): Promise<ToolListResponse[]> {
    return fetchJson<ToolListResponse[]>(`/api/v1/projects/${projectId}/tools`);
}

export async function getTool(
    toolId: string,
    projectId: string
): Promise<ToolResponse> {
    return fetchJson<ToolResponse>(`/api/v1/projects/${projectId}/tools/${toolId}`);
}

export async function importTool(
    toolData: ToolCreate,
    projectId: string
): Promise<ToolResponse> {
    return fetchJson<ToolResponse>(`/api/v1/projects/${projectId}/tools`, {
        method: "POST",
        body: JSON.stringify(toolData),
    });
}

export async function updateTool(
    toolId: string,
    toolData: ToolUpdate,
    projectId: string
): Promise<ToolResponse> {
    return fetchJson<ToolResponse>(`/api/v1/projects/${projectId}/tools/${toolId}`, {
        method: "PATCH",
        body: JSON.stringify(toolData),
    });
}

export async function deleteTool(
    toolId: string,
    projectId: string
): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/tools/${toolId}`, {
        method: "DELETE",
    });
}

export async function ensureUIResource(
    toolId: string,
    projectId: string
): Promise<ToolResponse> {
    return fetchJson<ToolResponse>(`/api/v1/projects/${projectId}/tools/${toolId}/ensure-ui-resource`, {
        method: "POST",
    });
}

export async function getToolDetail(toolId: string, projectId: string): Promise<ToolDetailResponse> {
    return fetchJson<ToolDetailResponse>(`/api/v1/projects/${projectId}/tools/${toolId}`);
}

export async function deleteToolDetail(toolId: string, projectId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/tools/${toolId}`, {
        method: "DELETE",
    });
}

export async function enableTool(toolId: string, projectId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/tools/${toolId}/enable`, {
        method: "POST",
    });
}

export async function disableTool(toolId: string, projectId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/tools/${toolId}/disable`, {
        method: "POST",
    });
}

// --- Toolkit Sources ---

export async function getToolkitSource(sourceId: string, projectId: string): Promise<ToolkitSourceDetail> {
    return fetchJson<ToolkitSourceDetail>(`/api/v1/projects/${projectId}/toolkit-sources/${sourceId}`);
}

export async function createToolkitSource(sourceData: ToolkitSourceCreate, projectId: string): Promise<ToolkitSourceDetail> {
    return fetchJson<ToolkitSourceDetail>(`/api/v1/projects/${projectId}/toolkit-sources`, {
        method: "POST",
        body: JSON.stringify(sourceData),
    });
}

// --- Toolkits ---

export async function listToolkits(projectId: string): Promise<Toolkit[]> {
    return fetchJson<Toolkit[]>(`/api/v1/projects/${projectId}/toolkits`);
}

export async function createToolkit(toolkitData: ToolkitCreate, projectId: string): Promise<Toolkit> {
    return fetchJson<Toolkit>(`/api/v1/projects/${projectId}/toolkits`, {
        method: "POST",
        body: JSON.stringify(toolkitData),
    });
}

export async function getToolkit(toolkitId: string, projectId: string): Promise<ToolkitDetail> {
    return fetchJson<ToolkitDetail>(`/api/v1/projects/${projectId}/toolkits/${toolkitId}`);
}

export async function deleteToolkit(toolkitId: string, projectId: string): Promise<void> {
    return fetchJson<void>(`/api/v1/projects/${projectId}/toolkits/${toolkitId}`, {
        method: "DELETE",
    });
}

export async function listToolkitTools(toolkitId: string, projectId: string): Promise<Tool[]> {
    const response = await fetchJson<ToolDetailResponse[]>(`/api/v1/projects/${projectId}/toolkits/${toolkitId}/tools`);
    // Convert ToolDetailResponse to Tool
    return response.map(detail => ({
        id: detail.id,
        toolId: detail.id,
        name: detail.name,
        description: detail.description,
        endpointType: "mcp" as EndpointType,
        endpointConfig: {} as MCPEndpointConfig | APIEndpointConfig, // Toolkit tools don't have full config in list view
        status: detail.is_enabled ? "active" as const : "disabled" as const,
        type: "mcp" as const,
        inputSchema: detail.inputSchema,
        outputSchema: detail.outputSchema,
    }));
}

