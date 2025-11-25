import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Tool, Resource } from "@modelcontextprotocol/sdk/types.js";

export type TransportType = "sse" | "streamable-http";
export type ConnectionType = "direct" | "tunnel";

export interface MCPConnectionConfig {
  transportType: TransportType;
  url: string;
  connectionType: ConnectionType;
  autoSwitch?: boolean;
  headers?: Record<string, string>;
  auth?: {
    type: string;
    [key: string]: any;
  };
}

class MCPClient {
  private mcp: Client;
  private transport: Transport | null = null;
  private tools: Tool[] = [];
  private resources: Resource[] = [];
  private isConnected = false;

  constructor() {
    this.mcp = new Client({ name: "mcp-client", version: "1.0.0" });
  }

  async connect(config: MCPConnectionConfig) {
    // Skip if already connected
    if (this.isConnected && this.transport !== null) {
      return;
    }

    // Handle relative URLs (for proxy) by constructing absolute URL from current origin
    let url: URL;
    if (config.url.startsWith('/') && typeof window !== 'undefined') {
      // Relative URL - use current origin (browser only)
      url = new URL(config.url, window.location.origin);
    } else {
      // Absolute URL
      url = new URL(config.url);
    }

    if (config.transportType === "streamable-http") {
      this.transport = new StreamableHTTPClientTransport(url);
    } else if (config.transportType === "sse") {
      this.transport = new SSEClientTransport(url);
    } else {
      throw new Error(`Invalid transport type: ${config.transportType}`);
    }
    if (config.connectionType === "direct") {
      await this.mcp.connect(this.transport);
      this.isConnected = true;
    } else {
      throw new Error(`Invalid connection type: ${config.connectionType}`);
    }
  }

  async listTools() {
    const { tools } = await this.mcp.listTools();
    this.tools = tools;
    return this.tools.map(tool => {
      // Extract input schema from MCP Tool's inputSchema property
      // MCP SDK uses JSON Schema format for inputSchema
      let inputSchema: Record<string, any> | null = null;
      if (tool.inputSchema) {
        // If inputSchema is an object, use it directly; otherwise try to serialize it
        try {
          inputSchema = typeof tool.inputSchema === 'object' && !Array.isArray(tool.inputSchema)
            ? (tool.inputSchema as Record<string, any>)
            : JSON.parse(JSON.stringify(tool.inputSchema));
        } catch (e) {
          console.warn('Failed to extract inputSchema from tool:', tool.name, e);
          inputSchema = null;
        }
      }

      let outputSchema: Record<string, any> | null = null;
      if ((tool as any).outputSchema) {
        try {
          outputSchema = typeof (tool as any).outputSchema === 'object' && !Array.isArray((tool as any).outputSchema)
            ? ((tool as any).outputSchema as Record<string, any>)
            : JSON.parse(JSON.stringify((tool as any).outputSchema));
        } catch (e) {
          console.warn('Failed to extract outputSchema from tool:', tool.name, e);
          outputSchema = null;
        }
      }

      return {
        ...tool,
        inputSchema,
        outputSchema,
      };
    });
  }

  async listResources() {
    const { resources } = await this.mcp.listResources();
    this.resources = resources as Resource[];
    return this.resources;
  }

  async callTool(props: {
    toolName: string;
    toolParams: Record<string, unknown> | undefined;
    originalQuery: string;
    iteration: number;
  }) {
    const { toolName, toolParams, originalQuery, iteration } = props;
    const toolResult = await this.mcp.callTool({
      name: toolName,
      arguments: toolParams,
    });

    // Parse content from MCP response
    // MCP returns content as an array of content items (e.g., [{ type: "text", text: "..." }])
    if (Array.isArray(toolResult.content)) {
      // Extract text content from all items
      const textContent = toolResult.content
        .map((item: any) => {
          if (item.type === 'text' && typeof item.text === 'string') {
            return item.text;
          }
          return null;
        })
        .filter((text: string | null) => text !== null)
        .join('\n');

      // Try to parse as JSON if it looks like JSON
      if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
        try {
          return JSON.parse(textContent);
        } catch (e) {
          // If parsing fails, return the text as-is
          return textContent;
        }
      }

      return textContent || toolResult.content;
    }

    // If content is not an array, try to parse it directly if it's a string
    if (typeof toolResult.content === 'string') {
      try {
        return JSON.parse(toolResult.content);
      } catch (e) {
        return toolResult.content;
      }
    }

    return toolResult.content;
  }

  async cleanup() {
    await this.mcp.close();
    this.isConnected = false;
    this.transport = null;
  }
}

export { MCPClient };