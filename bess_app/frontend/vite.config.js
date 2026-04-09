import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': 'http://backend:8000',
      '/bess-app-admin': 'http://backend:8000',
    },
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    entries: ['src/main.jsx'],
  }
})