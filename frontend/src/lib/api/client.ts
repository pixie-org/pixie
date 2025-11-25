export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "http://localhost:8000";
export const DEFAULT_PROJECT_ID = (import.meta.env.VITE_DEFAULT_PROJECT_ID as string) ?? "default-project";

export interface APIEndpointConfiguration {
    url: string;
    method?: string;
    headers?: Record<string, string> | null;
    timeout?: number | null;
}

export interface MCPClientConfiguration {
    server_url?: string | null;
    transport?: string | null;
    credentials?: Record<string, unknown> | null;
}

export class APIError extends Error {
    constructor(public status: number, public statusText: string, public body: string) {
        super(`API Error: ${status} ${statusText} - ${body}`);
        this.name = 'APIError';
    }
}

function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
    if (!headersInit) {
        return {};
    }
    if (headersInit instanceof Headers) {
        const obj: Record<string, string> = {};
        headersInit.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
    if (Array.isArray(headersInit)) {
        return Object.fromEntries(headersInit);
    }
    // If it's already a Record<string, string>, return it directly
    return headersInit;
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Prepend API_BASE_URL if the URL is relative
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const headers = {
        "Content-Type": "application/json",
        ...normalizeHeaders(options.headers),
    };

    const response = await fetch(fullUrl, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(response.status, response.statusText, errorText);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
}
