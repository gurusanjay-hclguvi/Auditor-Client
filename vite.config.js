import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  return {
    plugins: [react(), tailwindcss()],
    // Dev only: with VITE_BASE_URL=/api, API calls go through this proxy to the Go backend, so
    // the backend needs no CORS changes. /api is stripped because the backend serves /sales-audit.
    server: {
      proxy: {
        '/api': {
          target: env.DEV_API_TARGET || 'http://127.0.0.1:8080',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
