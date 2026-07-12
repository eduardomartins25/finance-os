import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './src/test/setup.ts',
    server: {
      deps: {
        inline: [true]
      }
    },
    deps: {
      inline: [true]
    }
  },
  ssr: {
    noExternal: [true]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
