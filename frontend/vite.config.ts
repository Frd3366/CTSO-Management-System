import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cms/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/cms/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cms\/api/, '/api')
      },
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  }
});
