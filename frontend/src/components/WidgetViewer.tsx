import { isUIResource } from '@mcp-ui/client';
import React from 'react';
import { PixieRenderer } from '../renderer/renderer';
import { callMcpToolViaWidget } from '@/lib/api';

interface UIResource {
  type?: 'resource';
  resource?: {
    uri?: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

interface WidgetViewerProps {
  uiResource: UIResource | null;
  widgetId: string;
  className?: string;
}

export const WidgetViewer: React.FC<WidgetViewerProps> = ({
  uiResource,
  widgetId,
  className = "w-full h-full border-0"
}) => {
  if (!isUIResource(uiResource as any)) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Unsupported resource</p></div>;
  }

  const mcpToolCallable = async (toolName: string, toolParams: Record<string, unknown>) => {
    const response = await callMcpToolViaWidget(widgetId, toolName, toolParams);
    console.log('[WidgetViewer] Response:', response);
    return response;
  };

  return (
    <PixieRenderer
      resource={uiResource?.resource}
      mcpToolCallable={mcpToolCallable}
    // className={className}
    // initialGlobals={{
    //   toolInput: {
    //     userId: 'widget-editor',
    //     initialized: true,
    //   },
    //   theme: 'light',
    //   widgetState: {
    //     page: 'widget-viewer',
    //     loaded: true,
    //   },
    //   }}
    />
  );
};

