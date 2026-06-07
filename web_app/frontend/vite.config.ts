import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  //base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    chunkSizeWarningLimit: 10_000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_GOOGLE_SHEET_DESIGN_ID: 'test-design-sheet-id',
    },
  },
  base: '/Tiktok_automate/'
})
