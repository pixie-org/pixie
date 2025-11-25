import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'McpUiShared',
      formats: ['es', 'umd'], // UMD for broader compatibility if needed, es for modern
      fileName: (format) =>
        `index.${format === 'es' ? 'mjs' : format === 'umd' ? 'js' : format + '.js'}`,
    },
    sourcemap: true,
    // Minify options if needed, default is esbuild which is fast
    // minify: 'terser',
    // terserOptions: { ... }
  },
});
