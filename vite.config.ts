import devServer from "@hono/vite-dev-server"
import path from "path"
import { fileURLToPath } from "url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!(api|auth|v1|health)\/).*$/] }),
    inspectAttr(),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    // Preserve native lazy-import recovery after a failed download in WebKit.
    // Optional dependency preloading is off; code splitting and CSS remain.
    modulePreload: false,
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // The repository also contains app/index.html. Force the canonical root
    // entry to produce dist/public/index.html for the Hono static server.
    rollupOptions: { input: {
      app: path.resolve(__dirname, "index.html"),
      checkout: path.resolve(__dirname, "paystack-checkout.html"),
    } },
  },
});
