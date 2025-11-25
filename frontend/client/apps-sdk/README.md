# Pixie SDK

A TypeScript SDK for managing Pixie widget state and API interactions. The SDK provides a configurable interface for handling Pixie globals and API calls, with default logging implementations that can be overridden.

## Features

- **Type-safe**: Full TypeScript support with generics for custom types
- **Configurable**: Override default API implementations or use logging defaults
- **State Management**: Manage widget state, tool inputs/outputs, and metadata
- **Window Integration**: Optional `window.pixie` attachment for compatibility

## Installation

```typescript
import { PixieAppsSdk } from "./apps-sdk";
// or
import { PixieAppsSdk } from "./client/apps-sdk";
```

## Basic Usage

### Simple Initialization

```typescript
import { PixieAppsSdk } from "./apps-sdk";

// Create SDK with default configuration (all API calls will log to console)
const sdk = new PixieAppsSdk();

// Access the combined pixie object (API + Globals)
const pixie = sdk.getPixie();

// Use it like window.pixie
await pixie.callTool("myTool", { arg1: "value" });
pixie.openExternal({ href: "https://example.com" });
```

### With Custom Globals

```typescript
const sdk = new PixieAppsSdk({
  globals: {
    theme: "dark",
    locale: "fr",
    displayMode: "fullscreen",
    userAgent: {
      device: { type: "desktop" },
      capabilities: {
        hover: true,
        touch: false,
      },
    },
    toolInput: {
      userId: "123",
      sessionId: "abc",
    },
  },
});

// Get current globals
const globals = sdk.getGlobals();
console.log(globals.theme); // "dark"

// Update globals
sdk.updateGlobals({
  theme: "light",
  locale: "en",
});
```

### With Custom API Implementations

```typescript
const sdk = new PixieAppsSdk({
  api: {
    callTool: async (name: string, args: Record<string, unknown>) => {
      // Your custom implementation
      const response = await fetch("/api/tools", {
        method: "POST",
        body: JSON.stringify({ name, args }),
      });
      return { result: await response.text() };
    },
    sendFollowUpMessage: async ({ prompt }) => {
      // Custom follow-up message handler
      console.log("Sending follow-up:", prompt);
      await sendMessageToServer(prompt);
    },
    openExternal: ({ href }) => {
      // Custom external link handler
      window.open(href, "_blank");
    },
    requestDisplayMode: async ({ mode }) => {
      // Custom display mode handler
      await updateDisplayMode(mode);
      return { mode };
    },
  },
});
```

### Attach to Window

```typescript
const sdk = new PixieAppsSdk({
  globals: {
    theme: "dark",
    // ... other config
  },
  api: {
    // ... custom API implementations
  },
});

// Attach to window.pixie for compatibility with existing code
sdk.attachToWindow();

// Now window.pixie is available
window.pixie.callTool("myTool", {});
```

## TypeScript with Generics

The SDK supports TypeScript generics for type-safe custom types:

```typescript
// Define your custom types
interface MyToolInput {
  userId: string;
  action: string;
}

interface MyToolOutput {
  success: boolean;
  data: unknown;
}

interface MyWidgetState {
  step: number;
  completed: boolean;
}

// Create SDK with typed generics
const sdk = new PixieAppsSdk<MyToolInput, MyToolOutput, unknown, MyWidgetState>({
  globals: {
    toolInput: {
      userId: "123",
      action: "submit",
    },
    widgetState: {
      step: 1,
      completed: false,
    },
  },
});

// Now everything is type-safe!
const globals = sdk.getGlobals();
globals.toolInput.userId; // ✅ TypeScript knows this is a string
globals.widgetState.step; // ✅ TypeScript knows this is a number

// Update with type safety
sdk.updateGlobals({
  widgetState: {
    step: 2,
    completed: true,
  },
});
```

## API Reference

### Constructor

```typescript
new PixieAppsSdk<ToolInput, ToolOutput, ToolResponseMetadata, WidgetState>(config?)
```

**Config Options:**
- `globals?: Partial<PixieGlobals>` - Initial globals state
- `api?: Partial<API>` - API method overrides

### Methods

#### `getGlobals()`

Returns a copy of the current globals state.

```typescript
const globals = sdk.getGlobals();
```

#### `updateGlobals(updates)`

Partially update the globals state.

```typescript
sdk.updateGlobals({
  theme: "dark",
  locale: "es",
});
```

#### `getAPI()`

Get the API object with all API methods.

```typescript
const api = sdk.getAPI();
await api.callTool("toolName", {});
```

#### `getPixie()`

Get the combined object (API + Globals), equivalent to `window.pixie`.

```typescript
const pixie = sdk.getPixie();
// Use pixie.callTool, pixie.theme, etc.
```

#### `attachToWindow()`

Attach the pixie object to `window.pixie` for compatibility.

```typescript
sdk.attachToWindow();
// Now window.pixie is available globally
```

## Complete Example

```typescript
import { PixieAppsSdk } from "./apps-sdk";

// Define types
interface AppState {
  currentPage: string;
  userPreferences: {
    notifications: boolean;
  };
}

// Initialize SDK
const sdk = new PixieAppsSdk<unknown, unknown, unknown, AppState>({
  globals: {
    theme: "dark",
    locale: "en",
    displayMode: "inline",
    widgetState: {
      currentPage: "home",
      userPreferences: {
        notifications: true,
      },
    },
  },
  api: {
    callTool: async (name, args) => {
      console.log(`Calling tool: ${name}`, args);
      // Your implementation here
      return { result: "success" };
    },
    sendFollowUpMessage: async ({ prompt }) => {
      console.log("Follow-up message:", prompt);
      // Send to your backend
    },
    openExternal: ({ href }) => {
      window.open(href, "_blank", "noopener,noreferrer");
    },
    requestDisplayMode: async ({ mode }) => {
      console.log("Requesting display mode:", mode);
      // Update UI accordingly
      return { mode };
    },
  },
});

// Attach to window if needed
if (typeof window !== "undefined") {
  sdk.attachToWindow();
}

// Use the SDK
const pixie = sdk.getPixie();

// Update state
await pixie.setWidgetState({
  currentPage: "settings",
  userPreferences: {
    notifications: false,
  },
});

// Call tools
const result = await pixie.callTool("updateSettings", {
  key: "theme",
  value: "light",
});

// Access globals
console.log("Current theme:", pixie.theme);
console.log("Current locale:", pixie.locale);
```

## Default Behavior

By default, all API methods log to the console:

- `callTool` - Logs tool name and args, returns empty result
- `sendFollowUpMessage` - Logs the prompt
- `openExternal` - Logs the href
- `requestDisplayMode` - Logs the mode and returns it

This makes it easy to develop and test without implementing full API logic upfront.

## Type Definitions

All types are automatically synced from `client/pixie.ts`. See that file for the complete type definitions, including:

- `PixieGlobals` - Widget state and configuration
- `API` - API methods interface
- `Theme`, `DisplayMode`, `UserAgent`, etc. - Supporting types

