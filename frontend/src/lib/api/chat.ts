import { fetchJson } from "./client";

export interface WidgetMessageData {
    message_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    ui_resource_id: string | null;
    created_at: string | null;
}

export interface ConversationResponse {
    conversation_id: string;
    widget_id: string;
    created_at: string | null;
}

export interface WidgetChatInitRequest {
    type: "init";
    widget_id: string;
}

export interface WidgetChatMessageRequest {
    type: "message";
    conversation_id: string;
    content: string;
}

export interface WidgetChatResponse {
    type: "init" | "message" | "error";
    conversation_id?: string;
    content: string;
    content_format: "markdown";
    ui_resource_id?: string | null;
    messages?: WidgetMessageData[] | null;
}

export async function getWidgetConversation(widgetId: string, projectId: string): Promise<ConversationResponse> {
    return fetchJson<ConversationResponse>(`/api/v1/projects/${projectId}/chat/widgets/${widgetId}/conversation`);
}

export async function getWidgetConversationMessages(widgetId: string, conversationId: string, projectId: string): Promise<WidgetMessageData[]> {
    return fetchJson<WidgetMessageData[]>(`/api/v1/projects/${projectId}/chat/widgets/${widgetId}/conversation/${conversationId}/messages`);
}
