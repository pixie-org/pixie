import asyncio
from contextlib import asynccontextmanager

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


class MCPClient:
    def __init__(self, max_retries: int = 3, retry_delay: float = 2.0, timeout: float = 30.0):
        self.session = None
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
                
    @asynccontextmanager
    async def connect_streamable_http(self, url: str):
        """Connect to MCP server using SSE transport with retry logic."""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                print(f"🔌 Connection attempt {attempt + 1}/{self.max_retries} to {url}")
                
                async with streamablehttp_client(url, timeout=self.timeout) as client_data:
                    read, write, *_ = client_data
                    async with ClientSession(read, write) as session:
                        print("   ✓ Streamable HTTP client connected")
                        await session.initialize()
                        print("   ✅ Session initialized successfully!")
                        self.session = session
                        
                        try:
                            yield session
                        finally:
                            self.session = None
                            print("   ✓ Session closed")
                        
                        return            
            except Exception as e:
                last_error = e

            if attempt < self.max_retries - 1:
                wait_time = self.retry_delay * (2 ** attempt)
                print(f"   ⏳ Waiting {wait_time:.1f}s before retry...")
                await asyncio.sleep(wait_time)
            else:
                print(f"\n❌ All {self.max_retries} connection attempts failed")
                if last_error:
                    raise last_error

    async def list_tools(self):
        """List all available tools from the server."""
        if not self.session:
            raise RuntimeError("Not connected to server")
        
        try:
            response = await self.session.list_tools()
            return response.tools
        except Exception as e:
            print(f"⚠️  Error listing tools: {type(e).__name__}: {e}")
            raise
    
    async def call_tool(self, tool_name: str, arguments: dict = None):
        """Call a specific tool with given arguments."""
        if not self.session:
            raise RuntimeError("Not connected to server")
        
        if arguments is None:
            arguments = {}
        
        try:
            result = await self.session.call_tool(tool_name, arguments)
            return result
        except Exception as e:
            error_type = type(e).__name__
            print(f"⚠️  Error calling tool '{tool_name}': {error_type}: {e}")
            raise


async def main():
    # url = 'https://0c1e1927-another-server.fly.dev/mcp'
    url = 'https://dfc1ba68-server.fly.dev/mcp'
    # url = 'http://localhost:9000/mcp'

    client = MCPClient(max_retries=3, retry_delay=2.0, timeout=30.0)
    
    async with client.connect_streamable_http(url):
        print(f"\n✅ Successfully connected to: {url}\n")
        print("\n📋 Available Tools:")
        tools = await client.list_tools()
        for tool in tools:
            print(f"  - {tool.name}: {tool.description}")        
        print("\n" + "="*60)
        
        # Call greet tool
        print("\n🔧 Calling 'greet' tool with name='Alice'")
        result = await client.call_tool("greet", {"name": "Alice"})
        print(f"Response: {result}")
        
        print("\n" + "="*60)
        
        return  # Success, exit

if __name__ == "__main__":
    asyncio.run(main())