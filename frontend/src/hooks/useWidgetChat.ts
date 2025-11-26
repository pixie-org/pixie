import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { type WidgetMessageData, type WidgetChatResponse, type WidgetChatInitRequest, type WidgetChatMessageRequest } from '@/lib/api';

export interface ChatMessage {
  message_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_format?: 'markdown' | 'plain';
  ui_resource_id?: string | null;
  created_at?: string | null;
}

interface UseWidgetChatOptions {
  widgetId: string;
  projectId: string;
  enabled?: boolean;
}

interface UseWidgetChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  uiResourceId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  reconnect: () => void;
}

export function useWidgetChat({
  widgetId,
  projectId,
  enabled = true,
}: UseWidgetChatOptions): UseWidgetChatReturn {
  const { token, guestModeEnabled } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uiResourceId, setUiResourceId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const widgetIdRef = useRef(widgetId);
  const projectIdRef = useRef(projectId);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    widgetIdRef.current = widgetId;
    projectIdRef.current = projectId;
    enabledRef.current = enabled;
  }, [widgetId, projectId, enabled]);

  // Convert WidgetMessageData to ChatMessage
  const convertMessage = useCallback((msg: WidgetMessageData): ChatMessage => {
    return {
      message_id: msg.message_id,
      role: msg.role,
      content: msg.content,
      content_format: 'markdown' as 'markdown' | 'plain',
      ui_resource_id: msg.ui_resource_id,
      created_at: msg.created_at,
    };
  }, []);

  const getWebSocketUrl = useCallback(
    (currentProjectId: string, authToken: string | null, isGuestMode: boolean) => {
      try {
        const apiUrl = new URL(API_BASE_URL);
        const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const base = `${protocol}//${apiUrl.host}${apiUrl.pathname ? apiUrl.pathname : ''}/api/v1/projects/${currentProjectId}/chat/widgets/ws`
          .replace(/\/+/g, '/')
          .replace(':/', '://');

        // In non-guest mode, attach JWT as `token` query param for WebSocket auth
        if (!isGuestMode && authToken) {
          const wsUrl = new URL(base);
          wsUrl.searchParams.set('token', authToken);
          return wsUrl.toString();
        }

        return base;
      } catch {
        // Fallback for simple URL format
        const wsBase = API_BASE_URL.replace(/^https?:\/\//, '');
        const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
        let url = `${protocol}://${wsBase}/api/v1/projects/${currentProjectId}/chat/widgets/ws`;

        if (!isGuestMode && authToken) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}token=${encodeURIComponent(authToken)}`;
        }

        return url;
      }
    },
    [],
  );

  const connect = useCallback(() => {
    const currentWidgetId = widgetIdRef.current;
    const currentProjectId = projectIdRef.current;
    const currentEnabled = enabledRef.current;
    
    if (!currentWidgetId || !currentProjectId || !currentEnabled) return;

    // Don't reconnect if we already have an active connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnecting(true);
    setError(null);
    reconnectAttemptsRef.current = 0;

    try {
      const wsUrl = getWebSocketUrl(currentProjectId, token, guestModeEnabled);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Verify this connection is still relevant
        if (widgetIdRef.current !== currentWidgetId || !enabledRef.current) {
          ws.close();
          return;
        }

        setIsConnecting(false);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        ws.send(JSON.stringify({
          type: 'init',
          widget_id: currentWidgetId,
        } as WidgetChatInitRequest));
      };

      ws.onmessage = (event) => {
        try {
          const response: WidgetChatResponse = JSON.parse(event.data);

          if (response.type === 'error') {
            setError(response.content);
            console.error('WebSocket error:', response.content);
            return;
          }

          if (response.type === 'init') {
            if (response.conversation_id) {
              setConversationId(response.conversation_id);
            }

            if (response.messages && response.messages.length > 0) {
              const convertedMessages = response.messages.map(convertMessage);
              setMessages(convertedMessages);
            } else {
              setMessages([{
                role: 'assistant',
                content: response.content,
                content_format: 'markdown',
                ui_resource_id: response.ui_resource_id,
              }]);
            }

            if (response.ui_resource_id) {
              setUiResourceId(response.ui_resource_id);
            }
          }

          if (response.type === 'message') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: response.content,
              content_format: 'markdown',
              ui_resource_id: response.ui_resource_id,
            }]);

            if (response.ui_resource_id) {
              setUiResourceId(response.ui_resource_id);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse server message');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error occurred');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        if (enabledRef.current && widgetIdRef.current === currentWidgetId && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to establish connection');
      setIsConnecting(false);
    }
  }, [getWebSocketUrl, convertMessage]);

  useEffect(() => {
    if (enabled && widgetId) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setMessages([]);
      setConversationId(null);
      setUiResourceId(null);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, widgetId, connect]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }

    if (!conversationId) {
      setError('Conversation not initialized');
      return;
    }

    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      content_format: 'plain',
    };
    setMessages(prev => [...prev, userMessage]);

    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversation_id: conversationId,
      content: content.trim(),
    } as WidgetChatMessageRequest));
  }, [conversationId]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  return {
    messages,
    conversationId,
    uiResourceId,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
  };
}
