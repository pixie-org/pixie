import type {
  PixieGlobals,
  API,
  Theme,
  UserAgent,
  DisplayMode,
  SafeArea,
  UnknownObject,
  CallTool,
  RequestDisplayMode,
  CallToolResponse,
} from "./types";

export interface PixieAppsSdkConfig<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> {
  // Initial globals state
  globals?: Partial<PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>>;
  
  // API overrides
  api?: Partial<API>;

  // Debug mode
  debugMode?: boolean;
}

export class PixieAppsSdk<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> {
  private globals: PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>;
  private api: API;
  private debugMode: boolean;
  
  constructor(config: PixieAppsSdkConfig<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState> = {}) {
    this.debugMode = config.debugMode ?? true;

    // Create promise-based API that uses postMessage
    const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  
    // Listen for responses
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data?.type === 'ui-message-response' && data.messageId) {
        const pending = pendingRequests.get(data.messageId);
        if (pending) {
          pendingRequests.delete(data.messageId);
          if (data.payload?.error) {
            pending.reject(new Error(data.payload.error.message || 'Request failed'));
          } else {
            pending.resolve(data.payload?.response);
          }
        }
      }
    });
  
    // Initialize default globals
    const defaultGlobals: PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState> = {
      theme: "light",
      userAgent: {
        device: { type: "unknown" },
        capabilities: {
          hover: false,
          touch: false,
        },
      },
      locale: "en",
      maxHeight: 0,
      displayMode: "inline",
      safeArea: {
        insets: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      toolInput: {} as ToolInput,
      toolOutput: null,
      toolResponseMetadata: null,
      widgetState: null,
      setWidgetState: async (state: WidgetState) => {
        console.log("[PixieAppsSdk] setWidgetState called:", state);
        this.globals.widgetState = state;
      },
    };

    function generateMessageId() {
      return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  
    // Merge with provided globals
    this.globals = {
      ...defaultGlobals,
      ...config.globals,
      // Ensure setWidgetState is properly bound
      setWidgetState: config.globals?.setWidgetState || defaultGlobals.setWidgetState,
    };

    // Initialize default API (logging implementations)
    const defaultAPI: API = {
      callTool: async (name: string, args: Record<string, unknown>): Promise<CallToolResponse> => {
        if (this.debugMode) {
          console.log("[PixieAppsSdk] callTool called:", { name, args });
        }
        return new Promise((resolve, reject) => {
          const messageId = generateMessageId();
          pendingRequests.set(messageId, { resolve, reject });
  
          window.parent.postMessage({
            type: 'tool',
            messageId: messageId,
            payload: { toolName: name, params: args }
          }, '*');
  
          // Timeout after 30 seconds
          setTimeout(() => {
            if (pendingRequests.has(messageId)) {
              pendingRequests.delete(messageId);
              reject(new Error('Tool call timed out'));
            }
          }, 30000);
        });
      },
  
      sendFollowUpMessage: (args: { prompt: string }): Promise<void> => {
        return new Promise((resolve, reject) => {
          const messageId = generateMessageId();
          pendingRequests.set(messageId, { resolve, reject });
  
          window.parent.postMessage({
            type: 'prompt',
            messageId: messageId,
            payload: { prompt: args.prompt }
          }, '*');
  
          setTimeout(() => {
            if (pendingRequests.has(messageId)) {
              pendingRequests.delete(messageId);
              reject(new Error('Request timed out'));
            }
          }, 30000);
        });
      },

      openExternal: (payload: { href: string }): void => {
        if (this.debugMode) {
          console.log("[PixieAppsSdk] openExternal called:", payload);
        }
        // Send link event to host
        window.parent.postMessage({
            type: 'link',
            payload: { url: payload.href }
          }, '*');
      },

      requestDisplayMode: async (args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }> => {
        if (this.debugMode) {
          console.log("[PixieAppsSdk] requestDisplayMode called:", args);
        }
        throw new Error("Not implemented");
      },
    };

    // Merge with provided API overrides
    this.api = {
      ...defaultAPI,
      ...config.api,
    };
  }

  /**
   * Get the current globals state
   */
  getGlobals(): PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState> {
    return { ...this.globals };
  }

  /**
   * Update globals (partial update)
   */
  updateGlobals(
    updates: Partial<PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>>
  ): void {
    this.globals = {
      ...this.globals,
      ...updates,
    };
  }

  /**
   * Get the API object
   */
  getAPI(): API {
    return this.api;
  }

  /**
   * Get the combined pixie object (API + Globals) for window.pixie compatibility
   */
  getPixie(): API & PixieGlobals<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState> {
    return {
      ...this.api,
      ...this.globals,
    };
  }

  /**
   * Set the pixie object on window (for compatibility with existing code)
   */
  attachToWindow(): void {
    if (typeof window !== "undefined") {
      (window as any).pixie = this.getPixie();
    }
  }
}

// Export types
export type {
  PixieGlobals,
  API,
  Theme,
  UserAgent,
  DisplayMode,
  SafeArea,
  UnknownObject,
  CallTool,
  RequestDisplayMode,
  CallToolResponse,
} from "./types";

