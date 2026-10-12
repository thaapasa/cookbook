import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Prefix keys need the trailing slash, or '/api' would also catch the client module /api.ts
      '/api/': 'http://localhost:3000',
      '^/mcp(?:[/?]|$)': 'http://localhost:3000',
      '/images/': 'http://localhost:3000',
    },
  },
});
