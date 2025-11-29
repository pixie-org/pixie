import type { MCPConnectionConfig } from "@/lib/mcp_client";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { ReactNode } from "react";

export type EndpointType = "mcp" | "api" | "script" | "webhook" | "integration";

export type MCPEndpointConfig = MCPConnectionConfig;

export interface APIEndpointConfig {
  endpoint: string;
  method?: string;
  timeout?: number;
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  endpointType: EndpointType;
  endpointConfig: MCPEndpointConfig | APIEndpointConfig;
  status?: "active" | "disabled";
  inputSchema?: Record<string, any> | null;
  outputSchema?: Record<string, any> | null;
  hasOutputSchema?: boolean;
}

export function hasOutputSchema(tool: Tool): boolean {
  if (tool.hasOutputSchema !== undefined) {
    return tool.hasOutputSchema;
  }
  return tool.outputSchema !== null && tool.outputSchema !== undefined && 
         (typeof tool.outputSchema === 'object' ? Object.keys(tool.outputSchema).length > 0 : true);
}

export type ToolWarningContext = "widget-creation" | "general";

export function getToolWarningTooltip(
  tool: Tool,
  context: ToolWarningContext = "general"
): ReactNode | null {
  if (hasOutputSchema(tool)) {
    return null;
  }

  const message = context === "widget-creation"
    ? "Output schema info is missing. Widget creation will likely be incorrect unless explicitly defined in prompt."
    : "Output schema info is missing for this tool";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className={`h-3.5 w-3.5 text-orange-500 shrink-0`} />
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <p className="break-words">{message}</p>
      </TooltipContent>
    </Tooltip>
  );
}

