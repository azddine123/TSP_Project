import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy : redirige /api vers le backend NestJS pour éviter les erreurs CORS en dev
    proxy: {
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
});
