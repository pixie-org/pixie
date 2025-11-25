import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL, DEFAULT_PROJECT_ID } from '@/lib/api';

export interface ChatMessage {
  message_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_format?: 'markdown' | 'plain';
  ui_resource?: any;
  created_at?: string;
}

export interface WebSocketResponse {
  type: 'init' | 'message' | 'error';
  conversation_id?: string;
  content: string;
  content_format?: 'markdown' | 'plain';
  ui_resource?: {
    type: 'resource';
    resource: {
      uri: string;
      mimeType: string;
      text?: string;
      blob?: string;
    };
  };
  messages?: ChatMessage[];
}

interface UseToolChatOptions {
  projectId?: string;
  toolId: string;
  enabled?: boolean;
}

interface UseToolChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  uiResource: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  reconnect: () => void;
}

export function useToolChat({
  projectId = DEFAULT_PROJECT_ID,
  toolId,
  enabled = true,
}: UseToolChatOptions): UseToolChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uiResource, setUiResource] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Store stable references to avoid unnecessary re-renders
  const toolIdRef = useRef(toolId);
  const projectIdRef = useRef(projectId);
  const enabledRef = useRef(enabled);

  // Update refs when values change (but don't trigger reconnection)
  useEffect(() => {
    toolIdRef.current = toolId;
    projectIdRef.current = projectId;
    enabledRef.current = enabled;
  }, [toolId, projectId, enabled]);

  // Convert HTTP URL to WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    try {
      const url = new URL(API_BASE_URL);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}${url.pathname ? url.pathname : ''}/api/v1/chat/ws`.replace(/\/+/g, '/').replace(':/', '://');
    } catch {
      // Fallback for simple URL format
      const wsUrl = API_BASE_URL.replace(/^https?:\/\//, '');
      const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
      return `${protocol}://${wsUrl}/api/v1/chat/ws`;
    }
  }, []);

  // Connection function - uses refs internally to avoid dependency issues
  const connect = useCallback(() => {
    const currentToolId = toolIdRef.current;
    const currentEnabled = enabledRef.current;
    
    if (!currentToolId || !currentEnabled) return;

    // Don't reconnect if we already have an active connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if any (in any other state)
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null; // Prevent reconnect logic
        wsRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
      wsRef.current = null;
    }

    setIsConnecting(true);
    setError(null);
    reconnectAttemptsRef.current = 0;

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Verify this connection is still relevant
        if (toolIdRef.current !== currentToolId || !enabledRef.current) {
          ws.close();
          return;
        }

        setIsConnecting(false);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Initialize conversation
        ws.send(JSON.stringify({
          type: 'init',
          project_id: projectIdRef.current,
          tool_id: currentToolId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data);

          if (response.type === 'error') {
            setError(response.content);
            console.error('WebSocket error:', response.content);
            return;
          }

          if (response.type === 'init') {
            // Set conversation ID
            if (response.conversation_id) {
              setConversationId(response.conversation_id);
            }

            // Load previous messages if present
            if (response.messages && response.messages.length > 0) {
              setMessages(response.messages);
            } else {
              // If no previous messages, add the init message
              setMessages([{
                role: 'assistant',
                content: response.content,
                content_format: response.content_format || 'markdown',
                ui_resource: response.ui_resource,
              }]);
            }

            // Handle UI resource from init
            if (response.ui_resource) {
              setUiResource(response.ui_resource);
            }
          }

          if (response.type === 'message') {
            // Add assistant response to messages
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: response.content,
                content_format: response.content_format || 'markdown',
                ui_resource: response.ui_resource,
              },
            ]);

            // Update UI resource if provided
            if (response.ui_resource) {
              setUiResource(response.ui_resource);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse server response');
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);

        // Only attempt to reconnect if:
        // 1. Not a clean close (code 1000)
        // 2. We have retries left
        // 3. Still enabled
        // 4. toolId hasn't changed (we're still on the same tool)
        if (event.code !== 1000 && 
            reconnectAttemptsRef.current < maxReconnectAttempts && 
            enabledRef.current && 
            toolIdRef.current === currentToolId) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s

          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabledRef.current && toolIdRef.current === currentToolId) {
              connect();
            }
          }, delay);
        } else {
          // Reset reconnect attempts if we're not reconnecting
          reconnectAttemptsRef.current = 0;
        }
      };
    } catch (err: any) {
      console.error('Failed to create WebSocket:', err);
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
      wsRef.current = null;
    }
  }, [getWebSocketUrl]); // Only depend on stable getWebSocketUrl

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected');
      return;
    }

    if (!conversationId) {
      setError('Conversation not initialized');
      return;
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send message via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversation_id: conversationId,
      content: content.trim(),
    }));
  }, [conversationId]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  // Track previous toolId/enabled to detect actual changes
  const prevToolIdRef = useRef<string | undefined>(undefined);
  const prevEnabledRef = useRef<boolean>(false);

  // Main connection effect - only runs when toolId or enabled actually changes
  useEffect(() => {
    const toolIdChanged = prevToolIdRef.current !== toolId;
    const enabledChanged = prevEnabledRef.current !== enabled;
    const shouldConnect = enabled && toolId;
    
    // Update previous values
    prevToolIdRef.current = toolId;
    prevEnabledRef.current = enabled;

    if (shouldConnect) {
      // Only connect if:
      // 1. toolId changed (new tool)
      // 2. enabled changed from false to true
      // 3. We don't have an active connection
      const isAlreadyConnected = wsRef.current && 
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING);
      
      if ((toolIdChanged || (enabledChanged && enabled)) && !isAlreadyConnected) {
        connect();
      }
    } else {
      // If disabled or no toolId, close existing connection
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore errors
        }
        wsRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
    }

    return () => {
      // Cleanup timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Only close WebSocket if we're transitioning away from this toolId
      // Check if next values are different
      if ((!enabled || !toolId || prevToolIdRef.current !== toolId) && wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore errors
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, enabled]); // Only depend on toolId and enabled, not connect

  return {
    messages,
    conversationId,
    uiResource,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
  };
}
