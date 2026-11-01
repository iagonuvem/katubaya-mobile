import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { syncHandler } from "./server/sync.mjs";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // Dev: the same sync receiver as `npm run serve`, so a phone on the LAN syncs to this machine
    { name: "katubaya-sync", configureServer(server) { server.middlewares.use(syncHandler(path.resolve(__dirname, "server/data"))); } },
    // Precache the app shell so the farm opens without internet; the manifest stays in public/
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-512-maskable.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,webp,woff,woff2}"], navigateFallback: "/index.html" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
