import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/main/__tests__/**/*.test.ts'],
    environment: 'node',
    alias: {
      electron: new URL('src/main/__tests__/__mocks__/electron.ts', import.meta.url).pathname
    }
  }
})
