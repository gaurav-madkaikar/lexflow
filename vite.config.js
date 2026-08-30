import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(projectDirectory, 'frontend')
    }
  },
  build: {
    outDir: 'public/ui-assets',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(projectDirectory, 'frontend/main.tsx'),
      formats: ['es'],
      fileName: 'lexflow-ui'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'lexflow-ui[extname]'
      }
    }
  }
});
