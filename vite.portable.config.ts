import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function stubPwaVirtualModule(): Plugin {
  const virtualId = 'virtual:pwa-register';
  const resolvedVirtualId = `\0${virtualId}`;
  return {
    name: 'stub-pwa-portable',
    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId;
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return 'export function registerSW() { return () => Promise.resolve(); }';
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), stubPwaVirtualModule(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-portable',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 10_000,
  },
});
