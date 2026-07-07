import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend dev-server (5174) mem-proxy /api ke backend Express (3002).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
});
