This example features a complete MCP remote server hosted on Cloudflare.

The server is the standard Cloudflare auth-less boilerplate. The only part relevant to `mcp-ui` is in the tool definitions (`src/index.ts`), where we return a UI resource created using `createUIResource` instead of a string.