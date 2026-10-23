import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api requests to backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
