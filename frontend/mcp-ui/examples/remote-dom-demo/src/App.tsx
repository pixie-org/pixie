import {
  UIResourceRenderer,
  basicComponentLibrary,
  remoteTextDefinition,
  remoteButtonDefinition,
  remoteStackDefinition,
  remoteImageDefinition,
} from '@mcp-ui/client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { defineWebComponents } from './libraries/webcomponents';
import { radixComponentLibrary } from './libraries/radix';
import './libraries/radix-styles.css';

const remoteElements = [
  remoteTextDefinition,
  remoteButtonDefinition,
  remoteStackDefinition,
  remoteImageDefinition,
];

const defaultRemoteDOMScript = `let isDarkMode = false;

// Create the main container stack with centered alignment
const stack = document.createElement('ui-stack');
stack.setAttribute('direction', 'vertical');
stack.setAttribute('spacing', '20');
stack.setAttribute('align', 'center');

// Create the title text
const title = document.createElement('ui-text');
title.setAttribute('content', 'Logo Toggle Demo');

// Create a centered container for the logo
const logoContainer = document.createElement('ui-stack');
logoContainer.setAttribute('direction', 'vertical');
logoContainer.setAttribute('spacing', '0');
logoContainer.setAttribute('align', 'center');

// Create the logo image (starts with light theme)
const logo = document.createElement('ui-image');
logo.setAttribute('src', 'https://block.github.io/goose/img/logo_light.png');
logo.setAttribute('alt', 'Goose Logo');
logo.setAttribute('width', '200');

// Create the toggle button
const toggleButton = document.createElement('ui-button');
toggleButton.setAttribute('label', '🌙 Switch to Dark Mode');

// Add the toggle functionality
toggleButton.addEventListener('press', () => {
  isDarkMode = !isDarkMode;
  
  if (isDarkMode) {
    // Switch to dark mode
    logo.setAttribute('src', 'https://block.github.io/goose/img/logo_dark.png');
    logo.setAttribute('alt', 'Goose Logo (Dark Mode)');
    toggleButton.setAttribute('label', '☀️ Switch to Light Mode');
  } else {
    // Switch to light mode
    logo.setAttribute('src', 'https://block.github.io/goose/img/logo_light.png');
    logo.setAttribute('alt', 'Goose Logo (Light Mode)');
    toggleButton.setAttribute('label', '🌙 Switch to Dark Mode');
  }
  
  console.log('Logo toggled to:', isDarkMode ? 'dark' : 'light', 'mode');
});

// Assemble the UI
logoContainer.appendChild(logo);
stack.appendChild(title);
stack.appendChild(logoContainer);
stack.appendChild(toggleButton);
root.appendChild(stack);
`;

function App() {
  const [scriptContent, setScriptContent] = useState(defaultRemoteDOMScript);
  const [inputValue, setInputValue] = useState(defaultRemoteDOMScript);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Always define web components for the web components example
    defineWebComponents();
  }, []);

  // Debounce the script content updates
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setScriptContent(inputValue);
      });
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const mockResourceReact = useMemo(
    () => ({
      mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
      text: scriptContent,
    }),
    [scriptContent],
  );

  const mockResourceWebComponents = useMemo(
    () => ({
      mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents',
      text: scriptContent,
    }),
    [scriptContent],
  );

  return (
    <div
      style={{
        opacity: isPending ? 0.8 : 1,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ textAlign: 'center' }}>MCP-UI Remote DOM Demo</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginTop: '2rem',
        }}
      >
        <div
          style={{
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ textAlign: 'center' }}>Basic React Components</h2>

          <UIResourceRenderer
            key={`basic-${scriptContent}`}
            resource={mockResourceReact}
            remoteDomProps={{
              library: basicComponentLibrary,
              remoteElements: remoteElements,
            }}
          />
        </div>

        <div
          style={{
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ textAlign: 'center' }}>Radix React Components</h2>

          <UIResourceRenderer
            key={`radix-${scriptContent}`}
            resource={mockResourceReact}
            remoteDomProps={{
              library: radixComponentLibrary,
              remoteElements: remoteElements,
            }}
          />
        </div>

        <div
          style={{
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ textAlign: 'center' }}>Web Components</h2>

          <UIResourceRenderer
            key={`webcomponents-${scriptContent}`}
            resource={mockResourceWebComponents}
            remoteDomProps={{
              library: basicComponentLibrary,
              remoteElements: remoteElements,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1rem' }}>
          Edit the Server's Resource `script` below to see the changes reflected in the host:
        </p>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{
            width: '100%',
            height: '300px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '12px',
            padding: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            backgroundColor: '#f8f9fa',
            color: '#333',
            lineHeight: '1.4',
          }}
          placeholder="Enter your remote DOM script here..."
        />
      </div>
    </div>
  );
}

export default App;
