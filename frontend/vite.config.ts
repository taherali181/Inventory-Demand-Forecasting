import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Matches the FastAPI backend's default CORS allowlist
    // (backend/config.py's cors_allowed_origins) — see frontend/README.md.
    port: 3000,
  },
})
