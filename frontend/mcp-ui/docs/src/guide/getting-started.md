# Getting Started

This guide will help you get started with the MCP-UI SDK, which provides tools for building Model Context Protocol (MCP) enabled applications with interactive UI components.

## Prerequisites

- Node.js (v22.x recommended for the Typescript SDK)
- pnpm (v9 or later recommended for the Typescript SDK)
- Ruby (v3.x recommended for the Ruby SDK)

## Installation

This project is a monorepo that includes the server and client SDKs.

### For Typescript SDKs (`@mcp-ui/server` and `@mcp-ui/client`)

1.  **Clone the Monorepo**:

    ```bash
    git clone https://github.com/idosal/mcp-ui.git
    cd mcp-ui
    ```

2.  **Install Dependencies**:
    From the root of the `mcp-ui` monorepo, run:
    ```bash
    pnpm install
    ```
    This command installs dependencies for all packages (`shared`, `client`, `server`, `docs`) and links them together using pnpm.

### For Ruby SDK (`mcp_ui_server`)

Add this line to your application's Gemfile:

```ruby
gem 'mcp_ui_server'
```

And then execute:

```bash
$ bundle install
```

Or install it yourself as:

```bash
$ gem install mcp_ui_server
```

## Building Packages

To build all library packages (`shared`, `client`, `server`):

```bash
pnpm --filter=!@mcp-ui/docs build
```

Each package uses Vite for building and will output distributable files to its respective `dist` directory.

## Running Tests

To run all tests across the monorepo using Vitest:

```bash
pnpm test
```

Or for coverage:

```bash
pnpm run coverage
```

## Using the Packages

Once built, you can typically import from the packages as you would with any other npm module, assuming your project is set up to resolve them.

### In a Server-Side Project
::: code-group
```typescript [TypeScript]
// main.ts (your server-side application)
import { createUIResource } from '@mcp-ui/server';

const myHtmlPayload = `<h1>Hello from Server!</h1><p>Timestamp: ${new Date().toISOString()}</p>`;

const resourceBlock = createUIResource({
  uri: 'ui://server-generated/item1',
  content: { type: 'rawHtml', htmlString: myHtmlPayload },
  encoding: 'text',
});

// Send this resourceBlock as part of your MCP response...
```
```ruby [Ruby]
# main.rb (your server-side application)
require 'mcp_ui_server'

my_html_payload = "<h1>Hello from Server!</h1><p>Timestamp: #{Time.now.iso8601}</p>"

resource_block = McpUiServer.create_ui_resource(
  uri: 'ui://server-generated/item1',
  content: { type: :raw_html, htmlString: my_html_payload },
  encoding: :text
)

# Send this resource_block as part of your MCP response...
```
:::

### In a React Project (Client-Side Example)

```tsx
// App.tsx (your React application)
import React, { useState, useEffect } from 'react';
import { UIResourceRenderer, UIActionResult } from '@mcp-ui/client';

// Dummy MCP response structure
interface McpToolResponse {
  content: any[];
}

function App() {
  const [mcpData, setMcpData] = useState<McpToolResponse | null>(null);

  // Simulate fetching MCP data
  useEffect(() => {
    const fakeMcpResponse: McpToolResponse = {
      content: [
        {
          type: 'resource',
          resource: {
            uri: 'ui://client-example/dynamic-section',
            mimeType: 'text/html',
            text: '<h2>Dynamic Content via MCP-UI</h2><button onclick="alert(\'Clicked!\')">Click me</button>',
          },
        },
      ],
    };
    setMcpData(fakeMcpResponse);
  }, []);

  const handleResourceAction = async (result: UIActionResult) => {
    if (result.type === 'tool') {
      console.log(`Action from resource (tool: ${result.payload.toolName}):`, result.payload.params);
    } else if (result.type === 'prompt') {
      console.log(`Prompt from resource:`, result.payload.prompt);
    } else if (result.type === 'link') {
      console.log(`Link from resource:`, result.payload.url);
    } else if (result.type === 'intent') {
      console.log(`Intent from resource:`, result.payload.intent);
    } else if (result.type === 'notify') {
      console.log(`Notification from resource:`, result.payload.message);
    }
    // Add your handling logic (e.g., initiate followup tool call)
    return { status: 'Action received by client' };
  };

  return (
    <div className="App">
      <h1>MCP Client Application</h1>
      {mcpData?.content.map((item, index) => {
        if (
          item.type === 'resource' &&
          item.resource.uri?.startsWith('ui://')
        ) {
          return (
            <div
              key={item.resource.uri || index}
              style={{
                border: '1px solid #eee',
                margin: '10px',
                padding: '10px',
              }}
            >
              <h3>Resource: {item.resource.uri}</h3>
              <UIResourceRenderer
                resource={item.resource}
                onUIAction={handleResourceAction}
              />
            </div>
          );
        }
        return <p key={index}>Unsupported content item</p>;
      })}
    </div>
  );
}

export default App;
```

Next, explore the specific guides for each SDK package to learn more about their APIs and capabilities.

To build specifically this package from the monorepo root:

```bash
pnpm build -w @mcp-ui/client
```

See the following pages for more details:

## Basic Setup

For MCP servers, you can use one of the server-side SDKs:
- **`@mcp-ui/server`** for Node.js projects
- **`mcp_ui_server`** for Ruby projects

For MCP clients, ensure `@mcp-ui/client` and its peer dependencies (`react` and potentially `@modelcontextprotocol/sdk`) are installed in your React project.

```bash
npm i @mcp-ui/client
```

## Key Components

### Server-Side SDKs
- **`@mcp-ui/server` (TypeScript)**:
  - **`createUIResource`**: Creates UI resource objects for MCP tool responses
- **`mcp_ui_server` (Ruby)**:
  - **`McpUiServer.create_ui_resource`**: Creates UI resource objects for MCP tool responses
- Handles HTML content, external URLs, Remote DOM JS, and encoding options

### Client-Side (`@mcp-ui/client`)
- **`<UIResourceRenderer />`**: Main component for rendering all types of MCP-UI resources
- **`<HTMLResourceRenderer />`**: Internal component for HTML resources
- **`<RemoteDOMResourceRenderer />`**: Internal component for Remote DOM resources

## Resource Types

MCP-UI supports several resource types:

1. **HTML Resources** (`text/html`): Direct HTML content
2. **External URLs** (`text/uri-list`): External applications and websites  
3. **Remote DOM Resources** (`application/vnd.mcp-ui.remote-dom+javascript`): Javascript-defined UI that use host-native components

All resource types are handled automatically by `<UIResourceRenderer />`.

## Next Steps

- **Server SDKs**: Learn how to create resources with our server-side packages.
  - [TypeScript SDK Usage & Examples](./server/typescript/usage-examples.md)
  - [Ruby SDK Usage & Examples](./server/ruby/usage-examples.md)
- **Client SDK**: Learn how to render resources.
  - [React Usage & Examples](./client/react-usage-examples.md)
- [Web Component Usage & Examples](./client/wc-usage-examples.md)
- **Protocol & Components**:
  - [Protocol Details](./protocol-details.md)
  - [UIResourceRenderer Component](./client/resource-renderer.md)

