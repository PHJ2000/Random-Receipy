import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type UserConfig } from 'vite'
import type { UserConfig as VitestUserConfig } from 'vitest/config'

const config: UserConfig & { test?: VitestUserConfig['test'] } = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    restoreMocks: true,
  },
}

// https://vite.dev/config/
export default defineConfig(config)
