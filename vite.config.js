import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, '.', 'API_PROXY_TARGET')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
