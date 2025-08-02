import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Don't try other ports if 5173 is busy
    host: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
    allowedHosts: ['localhost', '.railway.app', '.up.railway.app', 'healthcheck.railway.app'],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
