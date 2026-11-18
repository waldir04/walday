import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    env: {
      // Tests must not depend on the untracked local `.env` file.
      VITE_API_BASE_URL: 'http://localhost:8787',
      TZ: 'UTC',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'src/entities/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/features/**': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 85,
        },
      },
    },
  },
})
