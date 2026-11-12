import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reuses the app's Vite config so path aliases and the React plugin match the build.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/*.test.ts'],
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
        reporter: ['text', 'html', 'json-summary'],
        // Floor against regressions, set a little below the current numbers.
        // Ratchet these up as coverage improves, never down.
        thresholds: {
          lines: 50,
          statements: 44,
          functions: 50,
          branches: 33,
        },
      },
    },
  }),
)
