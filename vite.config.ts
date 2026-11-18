import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  // Relative asset paths so the packaged renderer loads over file://.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: { entry: 'electron/main.ts' },
      preload: {
        input: 'electron/preload.ts',
        // NOTE: sandboxed preloads must be CommonJS; .cjs keeps Node from treating it as ESM under "type": "module".
        vite: { build: { rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } } } },
      },
    }),
  ],
});
