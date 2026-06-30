import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression';
import { analyzer } from 'vite-bundle-analyzer';
import checker from 'vite-plugin-checker';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    checker({ typescript: true, overlay: false }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    analyzer({ analyzerMode: 'static', fileName: 'bundle-report' }),
    {
      name: 'inject-sw-version',
      closeBundle() {
        const swPath = path.resolve(__dirname, 'dist/sw.js');
        if (fs.existsSync(swPath)) {
          let content = fs.readFileSync(swPath, 'utf8');
          content = `// Build Timestamp: ${Date.now()}\n` + content;
          fs.writeFileSync(swPath, content, 'utf8');
          console.log('Injected build timestamp into dist/sw.js');
        }
      }
    }
  ],
  build: {
    cssCodeSplit: true,                // Split CSS per entry point
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-icons')) return 'react-icons';
          if (id.includes('@tanstack/react-query')) return 'react-query';
          if (id.includes('axios')) return 'axios';
          if (id.includes('react-router-dom')) return 'router';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
})
