
import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api/client';

export interface McpServerConfig {
  server_url: string;
  transport: 'streamable-http';
  credentials?: Record<string, string>;
}

export interface ToolCallResult {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error: string | null;
}

export interface McpChatResponse {
  type: 'init' | 'message' | 'error';
  session_id?: string;
  content: string;
  content_format?: 'markdown' | 'plain';
  tools?: {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[];
  tool_calls?: ToolCallResult[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_format?: 'markdown' | 'plain';
  tool_calls?: ToolCallResult[];
  timestamp: Date;
}

interface UseMcpChatOptions {
  mcpServer: McpServerConfig | null;
  apiUrl?: string;
  enabled?: boolean;
}

interface UseMcpChatReturn {
  isConnected: boolean;
  isInitialized: boolean;
  sessionId: string | null;
  tools: {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[];
  messages: ChatMessage[];
  error: string | null;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  initialize: (mcpServer: McpServerConfig) => Promise<void>;
  disconnect: () => void;
}

export function useMcpChat({
  mcpServer,
  apiUrl,
  enabled = true,
}: UseMcpChatOptions): UseMcpChatReturn {
  // Default URL derived from API_BASE_URL
  const defaultUrl = API_BASE_URL.replace(/^http/, 'ws') + '/api/v1/mcp-chat/ws';
  const wsUrl = apiUrl ?? defaultUrl;

  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tools, setTools] = useState<{
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, (response: McpChatResponse) => void>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const mcpServerRef = useRef<McpServerConfig | null>(mcpServer);

  const handleResponse = useCallback((response: McpChatResponse) => {
    if (response.type === 'init' && response.session_id) {
      setSessionId(response.session_id);
      setIsInitialized(true);
      setTools(response.tools ?? []);
      setError(null); // Clear any previous errors

      // Add initial assistant message
      if (response.content) {
        setMessages([{
          id: `init-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          content_format: response.content_format ?? 'markdown',
          timestamp: new Date(),
        }]);
      }
    } else if (response.type === 'message') {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          content_format: response.content_format ?? 'markdown',
          tool_calls: response.tool_calls,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    } else if (response.type === 'error') {
      setError(response.content);
      setIsLoading(false);
    }

    // Call registered handlers
    messageHandlersRef.current.forEach((handler) => {
      try {
        handler(response);
      } catch (err) {
        console.error('Error in message handler:', err);
      }
    });
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up any existing connection first (important for HMR)
    if (wsRef.current) {
      // Only close if it's not already closed
      if (wsRef.current.readyState !== WebSocket.CLOSED && wsRef.current.readyState !== WebSocket.CLOSING) {
        try {
          wsRef.current.close(1000, 'Reconnecting');
        } catch (err) {
          // Ignore errors when closing
          console.error('Error closing WebSocket:', err);
        }
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsInitialized(false);
    setError(null);

    // Update ref synchronously before connecting
    mcpServerRef.current = mcpServer;

    // Capture current mcpServer value for use in onopen
    const currentMcpServer = mcpServer;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to MCP Chat API');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Initialize immediately if we have mcpServer config
        // Check both the captured value and the ref (in case it was updated)
        const serverToUse = currentMcpServer ?? mcpServerRef.current;
        if (serverToUse && ws.readyState === WebSocket.OPEN) {
          const request = {
            type: 'init',
            mcp_server: serverToUse,
          };

          const messageId = `init-${Date.now()}`;
          const handler = (response: McpChatResponse) => {
            if (response.type === 'init') {
              messageHandlersRef.current.delete(messageId);
            } else if (response.type === 'error') {
              messageHandlersRef.current.delete(messageId);
              setError(response.content);
            }
          };

          messageHandlersRef.current.set(messageId, handler);
          ws.send(JSON.stringify(request));
        }
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data as string) as McpChatResponse;
          handleResponse(response);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse server response');
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        setIsInitialized(false);
        wsRef.current = null;

        // Only attempt to reconnect if we were initialized and enabled
        // Don't reconnect on normal close (code 1000) or if disabled
        if (enabled && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled && mcpServerRef.current) {
              connect();
            }
          }, delay);
        } else if (event.code === 1000) {
          // Normal close - reset reconnect attempts
          reconnectAttemptsRef.current = 0;
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setIsConnected(false);
    }
  }, [wsUrl, enabled, mcpServer, handleResponse]);

  const initialize = useCallback(async (mcpServerConfig: McpServerConfig): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const request = {
      type: 'init',
      mcp_server: mcpServerConfig,
    };

    return new Promise((resolve, reject) => {
      const messageId = `init-${Date.now()}`;

      const handler = (response: McpChatResponse) => {
        if (response.type === 'init') {
          messageHandlersRef.current.delete(messageId);
          resolve();
        } else if (response.type === 'error') {
          messageHandlersRef.current.delete(messageId);
          reject(new Error(response.content));
        }
      };

      messageHandlersRef.current.set(messageId, handler);
      wsRef.current!.send(JSON.stringify(request));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (messageHandlersRef.current.has(messageId)) {
          messageHandlersRef.current.delete(messageId);
          reject(new Error('Initialization timeout'));
        }
      }, 30000);
    });
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    // Check if WebSocket is actually connected and ready
    const ws = wsRef.current;
    const readyState = ws?.readyState;

    // If no WebSocket or not open, try to reconnect if we have config
    if (!ws || readyState !== WebSocket.OPEN) {
      // Only try to reconnect if we have mcpServer config and enabled
      if (mcpServerRef.current && enabled) {
        // Don't reconnect if already connecting
        if (readyState === WebSocket.CONNECTING) {
          throw new Error('WebSocket is still connecting. Please wait a moment.');
        }

        // Reconnect if closed or null
        if (!ws || readyState === WebSocket.CLOSED) {
          setError('Connection lost. Reconnecting...');
          setIsConnected(false);
          setIsInitialized(false);
          connect();
          throw new Error('Connection lost. Please wait a moment and try again.');
        }

        // If closing, just wait
        if (readyState === WebSocket.CLOSING) {
          throw new Error('WebSocket is closing. Please wait a moment.');
        }
      }

      // If we can't reconnect, show appropriate error
      const stateMessages: Record<number, string> = {
        [WebSocket.CONNECTING]: 'WebSocket is still connecting. Please wait a moment.',
        [WebSocket.CLOSING]: 'WebSocket is closing. Please wait a moment.',
        [WebSocket.CLOSED]: 'WebSocket is closed. Please reconnect to the MCP server.',
      };
      throw new Error(stateMessages[readyState ?? WebSocket.CLOSED] ?? 'WebSocket is not connected. Please reconnect to the MCP server.');
    }

    if (!sessionId) {
      throw new Error('Session not initialized. Please wait for initialization to complete.');
    }

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const request = {
      type: 'message',
      session_id: sessionId,
      content,
    };

    return new Promise((resolve, reject) => {
      const messageId = `msg-${Date.now()}`;

      const handler = (response: McpChatResponse) => {
        if (response.type === 'message') {
          messageHandlersRef.current.delete(messageId);
          resolve();
        } else if (response.type === 'error') {
          messageHandlersRef.current.delete(messageId);
          setIsLoading(false);
          reject(new Error(response.content));
        }
      };

      messageHandlersRef.current.set(messageId, handler);
      wsRef.current!.send(JSON.stringify(request));

      // Timeout after 60 seconds
      setTimeout(() => {
        if (messageHandlersRef.current.has(messageId)) {
          messageHandlersRef.current.delete(messageId);
          setIsLoading(false);
          reject(new Error('Message timeout'));
        }
      }, 60000);
    });
  }, [sessionId, enabled, connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsInitialized(false);
    setSessionId(null);
    setTools([]);
    setMessages([]);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Update mcpServer ref when it changes
  useEffect(() => {
    mcpServerRef.current = mcpServer;
  }, [mcpServer]);

  // Connect on mount or when enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        // Close with normal closure code
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      setIsConnected(false);
      setIsInitialized(false);
    };
  }, [enabled, connect, disconnect]);

  // Initialize when connected and mcpServer is provided (fallback if not initialized in onopen)
  useEffect(() => {
    if (isConnected && !isInitialized && mcpServer) {
      // Check if WebSocket is ready
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Small delay to ensure WebSocket is fully ready
        const timeoutId = setTimeout(() => {
          // Double-check state before initializing
          if (wsRef.current?.readyState === WebSocket.OPEN && mcpServerRef.current) {
            const currentMcpServer = mcpServerRef.current;
            initialize(currentMcpServer).catch((err) => {
              console.error('Failed to initialize:', err);
              if (err instanceof Error) {
                setError(err.message);
              } else {
                setError('Unknown initialization error');
              }
            });
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [isConnected, isInitialized, mcpServer, initialize]);

  return {
    isConnected,
    isInitialized,
    sessionId,
    tools,
    messages,
    error,
    isLoading,
    sendMessage,
    initialize,
    disconnect,
  };
}

