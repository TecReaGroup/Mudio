import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron/simple';

const ELECTRON_OUT_DIR = 'dist/electron';

export default defineConfig({
  // Relative asset paths so the packaged renderer loads over file://.
  base: './',
  // NOTE: "localhost" may bind to ::1 only while Electron resolves it to 127.0.0.1 → ERR_CONNECTION_REFUSED, window never shows.
  server: { host: '127.0.0.1' },
  // Renderer and Electron bundles share one dist/ root, so packaging ships a single folder.
  build: { outDir: 'dist/renderer' },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: { entry: 'electron/main.ts', vite: { build: { outDir: ELECTRON_OUT_DIR } } },
      preload: {
        input: 'electron/preload.ts',
        // NOTE: sandboxed preloads must be CommonJS; .cjs keeps Node from treating it as ESM under "type": "module".
        vite: { build: { outDir: ELECTRON_OUT_DIR, rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } } } },
      },
    }),
  ],
});
