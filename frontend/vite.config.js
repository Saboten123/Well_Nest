import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser only ever talks to one origin. In dev these proxies forward to the
// local services; in Docker, nginx (frontend/nginx.conf) does the same job.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // Main backend (REST)
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // Blockchain backend (payments, donations, outbreak reports, uploads)
      "/chain": {
        target: process.env.VITE_CHAIN_API_BASE_URL || "http://127.0.0.1:7000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chain/, ""),
      },
      // WebRTC signalling (Socket.IO)
      "/socket.io": {
        target: process.env.VITE_API_BASE_URL || "http://127.0.0.1:5000",
        ws: true,
        changeOrigin: true,
      },
      // AI assistant (FastAPI) — avoids CORS and allows cookie-based guest sessions
      "/ai": {
        target: process.env.VITE_AI_API_BASE_URL || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path.replace(/^\/ai/, ""),
      },
    },
  },
});