# MCP-UI Remote DOM Demo

This application serves as a hands-on demonstration and testing ground for the `@mcp-ui/client` package, which utilizes the `remote-dom` pattern. It provides a playground for developers to understand and test the interaction between a "remote" UI script and a "host" component library.

https://github.com/user-attachments/assets/cace78be-7ac5-47bc-bb41-d722e3e28304


## Key Concepts

The demo is split into two main concepts:

1.  **UI Script (The "Server"/"Remote" side):** This is a piece of JavaScript that declaratively defines the UI structure and behavior using a set of standard elements (e.g., `<ui-text>`, `<ui-button>`). In a real-world scenario, this script would be generated and served by an MCP server inside an EmbeddedResource (through the `mcp-ui` server SDK). In this demo, you can directly edit this script in the text area at the bottom of the page.

2.  **Component Library (The "Host"/"Client" side):** This is a set of UI components (e.g., React components, Web Components) that know how to render the elements defined in the UI script. The host application receives the UI script and uses its component library to render the actual UI to the user. This demo showcases three different component libraries running in parallel.

## How to Use the Demo

This demo is designed for two primary use cases: testing UI scripts and testing component libraries.

### Testing UI Scripts (for "Servers")

If you are developing a service that produces UI scripts, you can use this demo to test how they will render in different host environments.

1.  **Write your script:** Author a JavaScript script that interacts with the `root` element to build your UI. You can use elements like `ui-stack`, `ui-text`, `ui-button`, and `ui-image`. Use the default script as a starting point.
2.  **Paste your script:** Paste your code into the text area labeled "Edit the Server's Resource `script` below...".
3.  **Observe the output:** As you type, the three panels above will update in real-time to show how your script is rendered using:
    *   A set of basic, unstyled React components.
    *   A component library built with [Radix UI](https://www.radix-ui.com/).
    *   Standard Web Components.

This allows you to verify that your UI script is functionally correct and behaves as expected across various component implementations.

### Testing Component Libraries (for "Hosts")

If you are building a host application that needs to render remote UI, you can use this demo as a template for building and testing your own component library.

1.  **Explore the examples:** The `src/libraries` directory contains two example component library implementations:
    *   `radix.tsx`: A library that maps remote elements to styled React components from Radix UI.
    *   `webcomponents.ts`: A library that defines and registers standard custom elements.
2.  **Create your library:** Create a new file in `src/libraries` for your own component library. You will need to provide mappings from the remote element definitions (e.g., `remoteButtonDefinition`) to your actual components.
3.  **Integrate your library:** In `src/App.tsx`, import your new library and add a new `<RemoteDOMResourceRenderer>` instance inside the grid. Pass your component library to the `library` prop.
4.  **Test:** Run the demo and use the script editor to test how your component library handles various UI scenarios.

## Running the Demo Locally

To run this demo on your own machine, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  Open your browser to the URL provided by Vite (usually `http://localhost:5173`).

## Support
Please reach out through the Issues or directly!
