import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reuses the app's Vite config so path aliases and the React plugin match the build.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/stories/**', 'src/**/*.d.ts', 'src/main.tsx'],
        reporter: ['text', 'html'],
      },
    },
  }),
)
