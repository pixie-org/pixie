import { useState } from 'react';
import './App.css';
import { UIResourceRenderer } from '@mcp-ui/client';

function App() {
  const [useProxy, setUseProxy] = useState(false);
  const resource = {
    mimeType: 'text/uri-list',
    text: 'https://example.com',
  };
  const proxy = 'https://proxy.mcpui.dev/';

  return (
    <div>
      <h1>MCP-UI Proxy Demo</h1>
      <p>This demo shows how the proxy functionality works for external URLs in MCP-UI.</p>
      <p>
        <strong>CSP Simulation:</strong> This page includes a Content Security Policy (
        <code>frame-src 'self' https://proxy.mcpui.dev;</code>) that only allows iframes from this
        origin and <code>https://proxy.mcpui.dev</code>. This demonstrates how the{' '}
        <code>proxy</code> prop can be used to display external content on hosts with strict
        security policies.
      </p>
      <p>
        <code>proxy.mcpui.dev</code> hosts a simple script that renders the provided URL in a nested
        iframe. Hosts can use this script or host their own to achieve the same result.
      </p>

      <div className="demo-section">
        <h2>Direct URL (No Proxy)</h2>
        <p>
          This iframe attempts to load an external URL directly.{' '}
          <strong>It should be blocked by the browser's Content Security Policy.</strong>
        </p>
        <div className="code">
          Resource: {`{ mimeType: 'text/uri-list', text: 'https://example.com' }`}
        </div>
        <UIResourceRenderer resource={{ mimeType: 'text/uri-list', text: 'https://example.com' }} />
      </div>

      <div className="demo-section">
        <h2>Proxied URL</h2>
        <p>This iframe loads the external URL through the proxy:</p>
        <div className="code">
          Resource: {`{ mimeType: 'text/uri-list', text: 'https://example.com' }`}
          <br />
          Proxy: https://proxy.mcpui.dev/
          <br />
          Final URL: {`${proxy}?url=${encodeURIComponent(resource.text)}`}
        </div>
        <UIResourceRenderer
          resource={resource}
          htmlProps={{ proxy, style: { width: '500px', height: '500px' } }}
        />
      </div>

      <div className="demo-section">
        <h2>Interactive Demo</h2>
        <p>Toggle between direct and proxied loading:</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="toggle" onClick={() => setUseProxy(!useProxy)}>
            Toggle Proxy
          </button>
          <h1>{useProxy ? 'Proxied' : 'Direct (no proxy)'}</h1>
        </div>
        <div id="demo-container">
          <UIResourceRenderer resource={resource} htmlProps={useProxy ? { proxy } : {}} />
        </div>
        <div className="code" id="url-display">
          Current URL:{' '}
          {useProxy ? `${proxy}?url=${encodeURIComponent(resource.text)}` : resource.text}
        </div>
      </div>
    </div>
  );
}

export default App;
