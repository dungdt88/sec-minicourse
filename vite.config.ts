/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local Supabase behind the dev server, so phones on the same Wi-Fi reach it through one
    // address (VITE_SUPABASE_URL=/sb in .env.development).
    proxy: { '/sb': { target: 'http://127.0.0.1:54321', changeOrigin: true, rewrite: (p) => p.replace(/^\/sb/, '') } },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the child-facing bundle small; the mentor console and PDF code load on demand.
        manualChunks: (id) => (id.includes('pdfmake') ? 'pdfmake' : undefined),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
