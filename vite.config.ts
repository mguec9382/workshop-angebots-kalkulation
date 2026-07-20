import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative Pfade -> Build laeuft in jedem Unterordner / auf jedem Static-Host
  base: './',
  plugins: [react()],
  server: {
    port: 5180,
    open: true,
  },
})
