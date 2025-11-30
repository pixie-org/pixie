import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, broadcastTokenRefresh, isTokenExpiringWithin } from "@/lib/auth/tokenUtils";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = apiBaseUrl && apiBaseUrl.trim() !== "" 
  ? apiBaseUrl 
  : "";

const REFRESH_WINDOW_MS = 60 * 60 * 1000; // 1 hour
let refreshPromise: Promise<boolean> | null = null;

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

async function refreshAccessTokenViaApi(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        return false;
    }

    const url = `${API_BASE_URL}/api/v1/public/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`;

    try {
        const response = await fetch(url, { method: "POST" });
        if (!response.ok) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            broadcastTokenRefresh(null);
            return false;
        }

        const data = await response.json();
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        broadcastTokenRefresh(data.access_token);
        return true;
    } catch {
        return false;
    }
}

async function ensureFreshAccessToken(): Promise<void> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        return;
    }

    if (!isTokenExpiringWithin(token, REFRESH_WINDOW_MS)) {
        return;
    }

    if (!refreshPromise) {
        refreshPromise = refreshAccessTokenViaApi();
    }

    try {
        await refreshPromise;
    } finally {
        refreshPromise = null;
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
    await ensureFreshAccessToken();

    // Prepend API_BASE_URL if the URL is relative
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Get auth token from localStorage
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...normalizeHeaders(options.headers),
    };

    // Add Authorization header if token exists
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

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
