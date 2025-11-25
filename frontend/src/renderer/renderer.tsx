/**
 * PixieRenderer - A wrapper around UIResourceRenderer that includes
 * all SDK initialization, event handling, and state management logic.
 * 
 * This component consolidates all SDK functionality so it doesn't need to be
 * duplicated across different pages.
 */

import React, { useCallback, useRef } from 'react';
import { UIResourceRenderer, UIResourceRendererProps } from '../../mcp-ui/sdks/typescript/client/src/components/UIResourceRenderer';
import { EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';
import { UIActionResult } from '../../mcp-ui/sdks/typescript/client/src/types';

export interface PixieRendererProps extends UIResourceRendererProps {
  resource: Partial<EmbeddedResource>;
  mcpToolCallable?: (toolName: string, toolParams: Record<string, unknown>) => unknown;
}

export const PixieRenderer: React.FC<PixieRendererProps> = ({
  resource,
  mcpToolCallable = undefined
}) => {

  const handleUIAction = useCallback(async (result: UIActionResult) => {
    console.log('[PixieRenderer] Received UI action:', result.type, result.payload);

    try {
      switch (result.type) {
        case 'tool': {
          const toolName = result.payload.toolName;
          const toolParams = result.payload.params;

          if (!mcpToolCallable) {
            throw new Error('mcp_tool_callable is not provided');
          }

          // Wrap connection and tool call in a promise
          return new Promise(async (resolve, reject) => {
            try {
              const toolResult = await mcpToolCallable(toolName, toolParams);
              console.log('[PixieRenderer] Tool result:', toolResult);
              resolve(toolResult);
            } catch (error) {
              console.error('[PixieRenderer] Error in tool call:', error);
              reject(error);
            }
          });
        }

        case 'prompt': {
          // This is in host, we want to send prompt to the llm client
          return { success: true };
        }

        case 'link': {
          // Open external link directly
          if (result.payload.url) {
            window.open(result.payload.url, '_blank', 'noopener,noreferrer');
          }
          return { success: true };
        }
        
        default:
          return Promise.reject(new Error('Action not supported by host application'));
      }
    } catch (error) {
      console.error('[PixieRenderer] Error handling UI action:', error);
      throw error;
    }
  }, [mcpToolCallable]);

  return (
    <div className="w-full h-full border-0">
      <UIResourceRenderer
        resource={resource}
        onUIAction={handleUIAction}
      />
    </div>
  );
};
