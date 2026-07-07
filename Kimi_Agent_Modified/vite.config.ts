import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Kimi plugin removed for better GitHub Pages compatibility
// If needed, uncomment the line below and install kimi-plugin-inspect-react
// import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
