import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

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
    // Precache the app shell so the farm opens without internet; the manifest stays in public/
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,webp,woff,woff2}"], navigateFallback: "/index.html" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
