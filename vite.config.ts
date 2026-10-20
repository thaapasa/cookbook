import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The client compares this to version.json to see that a new version is deployed.
const buildId = String(Date.now());

function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss(), versionFile()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
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
