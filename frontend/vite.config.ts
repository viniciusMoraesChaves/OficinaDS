import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // <- Confirma se está 3000 aqui!
        changeOrigin: true,
        secure: false,
      },
    },
  },
});