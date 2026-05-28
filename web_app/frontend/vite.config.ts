import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    // Needed for viteSingleFile — disables the chunk size warning
    chunkSizeWarningLimit: 10_000,
  },
})
