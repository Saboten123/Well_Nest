import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy AI backend to avoid CORS and allow cookie-based guest sessions
      "/ai": {
        target: process.env.VITE_AI_API_BASE_URL || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        // keep cookies and set proper cookie domain/path
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path.replace(/^\/ai/, ""),
      },
    },
  },
});
