import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        'src/i18n/translator.js',
        'src/components/TipTapEditor.jsx',
        'src/pages/skeletons/**',
        'src/test/**',
        'src/api.js',
        'src/utils/structuredItems.js',
        'src/utils/structuredDataRows.js'
      ],
      thresholds: {
        statements: 60,
      }
    },
  },
});
