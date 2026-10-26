import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET, API_KEYS } = { ...loadEnv(mode, '.', ['API_PROXY_TARGET', 'API_KEYS']), ...process.env }
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          headers: API_KEYS ? { 'X-API-Key': API_KEYS.split(',')[0].trim() } : {},
        },
      },
    },
  }
})
