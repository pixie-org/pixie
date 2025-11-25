import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entryPoint = path.join(__dirname, 'apps-sdk', 'index.ts');
const outfile = path.join(__dirname, '..', 'public', 'client', 'pixie-apps-sdk.bundle.js');

try {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile,
    format: 'iife',
    globalName: 'PixieAppsSdk',
    platform: 'browser',
    target: 'es2020',
    minify: false, // Set to true for production
    sourcemap: false,
    external: [], // Bundle all dependencies
  });
  
  // Append auto-initialization code to attach window.pixie
  const bundleContent = readFileSync(outfile, 'utf8');
  const initializationCode = `
// Auto-initialize and attach to window.pixie
(function() {
  if (typeof window === 'undefined') return;
  
  try {
    var PixieAppsSdkClass = null;
    
    // Try to get the PixieAppsSdk class from the bundle (exported as PixieAppsSdk under PixieAppsSdk global)
    if (PixieAppsSdk && PixieAppsSdk.PixieAppsSdk && typeof PixieAppsSdk.PixieAppsSdk === 'function') {
      PixieAppsSdkClass = PixieAppsSdk.PixieAppsSdk;
    } else if (PixieAppsSdk && typeof PixieAppsSdk === 'function') {
      PixieAppsSdkClass = PixieAppsSdk;
    }
    
    if (PixieAppsSdkClass) {
      // Only initialize if window.pixie doesn't already exist
      if (!window.pixie) {
        var sdk = new PixieAppsSdkClass();
        sdk.attachToWindow();
        console.log('[PixieAppsSdk] Auto-initialized and attached to window.pixie');
      }
    } else {
      console.warn('[PixieAppsSdk] Could not find PixieAppsSdk class to initialize');
    }
  } catch (error) {
    console.error('[PixieAppsSdk] Error during auto-initialization:', error);
  }
})();
`;
  
  writeFileSync(outfile, bundleContent + initializationCode, 'utf8');
  
  console.log(`✓ Successfully bundled SDK to ${outfile}`);
} catch (error) {
  console.error('✗ Build failed:', error);
  process.exit(1);
}

