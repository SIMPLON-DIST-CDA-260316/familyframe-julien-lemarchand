import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expose on the LAN so a phone can reach the dev server.
    host: true,
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
})
