# ruby-server-demo

This barebones server demonstrates how to use `mcp_ui_server` to generate three types of UI resources: `externalUrl`, `rawHtml`, and `remoteDom`.

Each resource type has a dedicated tool:
- `ExternalUrlTool`: Returns a resource that renders an external webpage (`https://example.com`) in an iframe.
- `RawHtmlTool`: Returns a resource containing a simple raw HTML string.
- `RemoteDomTool`: Returns a resource with a JavaScript snippet that manipulates the DOM of the client application.

For a detailed explanation of how this server works, see the [Ruby Server Walkthrough](https://mcpui.dev/guide/server/ruby/walkthrough).

## Running the server

1. **Install dependencies:**
   ```sh
   bundle install
   ```
2. **Start the server:**
   ```sh
   ruby server.rb
   ```
   The server will be running at `http://localhost:8081/mcp`.

You can view the UI resources from this server by connecting to it with the [`ui-inspector`](https://github.com/idosal/ui-inspector) (target `http://localhost:8081/mcp`).