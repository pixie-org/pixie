var PixieAppsSdk = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // client/apps-sdk/index.ts
  var index_exports = {};
  __export(index_exports, {
    PixieAppsSdk: () => PixieAppsSdk
  });
  var PixieAppsSdk = class {
    constructor(config = {}) {
      __publicField(this, "globals");
      __publicField(this, "api");
      __publicField(this, "debugMode");
      this.debugMode = config.debugMode ?? true;
      const pendingRequests = /* @__PURE__ */ new Map();
      window.addEventListener("message", (event) => {
        const data = event.data;
        if (data?.type === "ui-message-response" && data.messageId) {
          const pending = pendingRequests.get(data.messageId);
          if (pending) {
            pendingRequests.delete(data.messageId);
            if (data.payload?.error) {
              pending.reject(new Error(data.payload.error.message || "Request failed"));
            } else {
              pending.resolve(data.payload?.response);
            }
          }
        }
      });
      const defaultGlobals = {
        theme: "light",
        userAgent: {
          device: { type: "unknown" },
          capabilities: {
            hover: false,
            touch: false
          }
        },
        locale: "en",
        maxHeight: 0,
        displayMode: "inline",
        safeArea: {
          insets: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          }
        },
        toolInput: {},
        toolOutput: null,
        toolResponseMetadata: null,
        widgetState: null,
        setWidgetState: async (state) => {
          console.log("[PixieAppsSdk] setWidgetState called:", state);
          this.globals.widgetState = state;
        }
      };
      function generateMessageId() {
        return "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      }
      this.globals = {
        ...defaultGlobals,
        ...config.globals,
        // Ensure setWidgetState is properly bound
        setWidgetState: config.globals?.setWidgetState || defaultGlobals.setWidgetState
      };
      const defaultAPI = {
        callTool: async (name, args) => {
          if (this.debugMode) {
            console.log("[PixieAppsSdk] callTool called:", { name, args });
          }
          return new Promise((resolve, reject) => {
            const messageId = generateMessageId();
            pendingRequests.set(messageId, { resolve, reject });
            window.parent.postMessage({
              type: "tool",
              messageId,
              payload: { toolName: name, params: args }
            }, "*");
            setTimeout(() => {
              if (pendingRequests.has(messageId)) {
                pendingRequests.delete(messageId);
                reject(new Error("Tool call timed out"));
              }
            }, 3e4);
          });
        },
        sendFollowUpMessage: (args) => {
          return new Promise((resolve, reject) => {
            const messageId = generateMessageId();
            pendingRequests.set(messageId, { resolve, reject });
            window.parent.postMessage({
              type: "prompt",
              messageId,
              payload: { prompt: args.prompt }
            }, "*");
            setTimeout(() => {
              if (pendingRequests.has(messageId)) {
                pendingRequests.delete(messageId);
                reject(new Error("Request timed out"));
              }
            }, 3e4);
          });
        },
        openExternal: (payload) => {
          if (this.debugMode) {
            console.log("[PixieAppsSdk] openExternal called:", payload);
          }
          window.parent.postMessage({
            type: "link",
            payload: { url: payload.href }
          }, "*");
        },
        requestDisplayMode: async (args) => {
          if (this.debugMode) {
            console.log("[PixieAppsSdk] requestDisplayMode called:", args);
          }
          throw new Error("Not implemented");
        }
      };
      this.api = {
        ...defaultAPI,
        ...config.api
      };
    }
    /**
     * Get the current globals state
     */
    getGlobals() {
      return { ...this.globals };
    }
    /**
     * Update globals (partial update)
     */
    updateGlobals(updates) {
      this.globals = {
        ...this.globals,
        ...updates
      };
    }
    /**
     * Get the API object
     */
    getAPI() {
      return this.api;
    }
    /**
     * Get the combined pixie object (API + Globals) for window.pixie compatibility
     */
    getPixie() {
      return {
        ...this.api,
        ...this.globals
      };
    }
    /**
     * Set the pixie object on window (for compatibility with existing code)
     */
    attachToWindow() {
      if (typeof window !== "undefined") {
        window.pixie = this.getPixie();
      }
    }
  };
  return __toCommonJS(index_exports);
})();

// Auto-initialize and attach to window.pixie
(function() {
  if (typeof window === 'undefined') return;
  
  try {
    var PixieAppsSdkClass = null;
    
    // Try to get the PixieAppsSdk class from the bundle (exported as PixieAppsSdk under PixieAppsSdk global)
    if (PixieAppsSdk && PixieAppsSdk.PixieAppsSdk && typeof PixieAppsSdk.PixieAppsSdk === 'function') {
      PixieAppsSdkClass = PixieAppsSdk.PixieAppsSdk;
    } else if (PixieAppsSdk && typeof PixieAppsSdk === 'function') {
      PixieAppsSdkClass = PixieAppsSdk;
    }
    
    if (PixieAppsSdkClass) {
      // Only initialize if window.pixie doesn't already exist
      if (!window.pixie) {
        var sdk = new PixieAppsSdkClass();
        sdk.attachToWindow();
        console.log('[PixieAppsSdk] Auto-initialized and attached to window.pixie');
      }
    } else {
      console.warn('[PixieAppsSdk] Could not find PixieAppsSdk class to initialize');
    }
  } catch (error) {
    console.error('[PixieAppsSdk] Error during auto-initialization:', error);
  }
})();
