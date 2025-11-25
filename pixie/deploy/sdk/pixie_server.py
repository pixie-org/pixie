import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass

import requests
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


class MCPClient:
    def __init__(self, url: str, max_retries: int = 3, retry_delay: float = 2.0, timeout: float = 30.0):
        self.url = url
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.session = None
 
    @asynccontextmanager
    async def connect_streamable_http(self):
        """Connect to MCP server using SSE transport with retry logic."""
        last_error = None
        url = self.url
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
                print(f"❌ All {self.max_retries} connection attempts failed")
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


class ApiClient:
    def call_api(self, endpoint: str, method: str = "GET", data: dict = None):
        response = requests.request(method, f"{self.base_url}/{endpoint}", json=data)
        return response.json()
