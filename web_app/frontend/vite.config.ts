import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',   // relative paths — works via file:// and localhost
  plugins: [react()],
})
