import { resolve } from 'path';

import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@audio': resolve(__dirname, 'src/audio'),
      '@ws': resolve(__dirname, 'src/ws'),
      '@ui': resolve(__dirname, 'src/ui'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
