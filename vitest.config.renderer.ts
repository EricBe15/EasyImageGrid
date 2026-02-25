import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/renderer/src/__tests__/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['src/renderer/src/__tests__/setup.ts']
  }
})
