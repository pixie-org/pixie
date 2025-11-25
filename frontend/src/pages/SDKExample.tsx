/**
 * SDK Example Page
 * 
 * This page demonstrates the Pixie Client SDK using PixieRenderer,
 * which consolidates all SDK initialization, event handling, and state management.
 */

import { PixieAppsSdk } from '../../client/apps-sdk';
import { PixieRenderer } from '../renderer/renderer';
import { callMcpToolViaWidget, getWidget, getToolDetail } from '@/lib/api';

// Example resource for demonstrating PixieRenderer
const exampleResourceForRenderer = {
  uri: 'resource://example-widget-renderer',
  mimeType: 'text/html',
  text: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pixie Widget Example (via PixieRenderer)</title>
      <script src="/client/pixie-apps-sdk.bundle.js"></script>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-top: 0;
        }
        .button-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: all 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-success {
          background: #28a745;
          color: white;
        }
        .btn-warning {
          background: #ffc107;
          color: #333;
        }
        .btn-info {
          background: #17a2b8;
          color: white;
        }
        .btn-danger {
          background: #dc3545;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Pixie Widget Example</h1>
        <p>This widget demonstrates various SDK capabilities:</p>
        <ul>
          <li>Calling tools via <code>callTool</code></li>
          <li>Sending followup messages</li>
          <li>Opening external links</li>
        </ul>
        
        <div class="button-group">
          <button class="btn-primary" onclick="handleCallTool()">
            Call Tool: getWeather
          </button>
          <button class="btn-success" onclick="handleSendFollowup()">
            Send Followup Message
          </button>
          <button class="btn-danger" onclick="handleOpenExternal()">
            Open External Link
          </button>
        </div>
      </div>

      <script>
        // Call tool using SDK directly
        async function handleCallTool() {
          try {
            const result = await window.pixie.callTool('get_weather', {
              location: 'San Francisco'
            });
            console.log('[handleCallTool] API.callTool completed:', result);
          } catch (error) {
            console.error(error.message || 'Failed to call tool');
          }
        }

        // Send followup message using SDK directly
        async function handleSendFollowup() {
          try {
            await window.pixie.sendFollowUpMessage({
              prompt: 'Can you help me understand the weather data?'
            });
            console.log('[handleSendFollowup] API.sendFollowupMessage completed');
          } catch (error) {
            console.error(error.message || 'Failed to send followup');
          }
        }

        // Open external link using SDK directly
        function handleOpenExternal() {
          try {
            window.pixie.openExternal({
              href: 'https://github.com/guru3s/pixie-web'
            });
            console.log('[handleOpenExternal] API.openExternal completed');
          } catch (error) {
            console.error(error.message || 'Failed to open link');
          }
        }

        // Attach handlers to window for onclick handlers
        window.handleCallTool = handleCallTool;
        window.handleSendFollowup = handleSendFollowup;
        window.handleOpenExternal = handleOpenExternal;
      </script>
    </body>
    </html>
  `,
  _meta: {
    'mcpui.dev/ui-preferred-frame-size': ['600px', '600px'],
  }
};

export default function SDKExample() {
  const widgetId = 'ac0d7623';
  const toolName = 'get_weather';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">pixie-client SDK Example</h1>
        <p className="text-muted-foreground">
          This page demonstrates the complete pixie-client SDK functionality using PixieRenderer,
          which includes all SDK initialization, event handling, and state management in a single component.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ minHeight: '600px'}}>
        <PixieRenderer
          resource={exampleResourceForRenderer}
          mcpToolCallable={async (toolName, toolParams) => {
            console.log('[SDKExample] Calling tool:', toolName, toolParams);
            
            // Call the MCP tool via the backend API
            const response = await callMcpToolViaWidget(
              widgetId,
              toolName,
              toolParams
            );

            // Handle errors from the API response
            if (response.error) {
              throw new Error(response.error);
            }

            // Parse the result text if it's JSON, similar to MCP client behavior
            let parsedResult: any = null;
            if (response.result?.text) {
              const text = response.result.text.trim();
              if (text.startsWith('{') || text.startsWith('[')) {
                try {
                  parsedResult = JSON.parse(text);
                } catch (e) {
                  // If parsing fails, use the text as-is
                  parsedResult = text;
                }
              } else {
                parsedResult = text;
              }
            } else if (response.result?.content && response.result.content.length > 0) {
              // If no text but has content array, join it
              parsedResult = response.result.content.join('\n');
            }

            // Return in the format expected by the SDK: { result: ..., error: null }
            return {
              result: parsedResult || response.result,
              error: null
            };
          }}
          // initialGlobals={{
          //   toolInput: {
          //     userId: 'demo-user',
          //     initialized: true,
          //   },
          //   theme: 'light',
          //   widgetState: {
          //     page: 'sdk-example',
          //     loaded: true,
          //   },
          // }}
        />
      </div>
    </div>
  );
}
