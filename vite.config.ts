import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@contracts": path.resolve(__dirname, "contracts"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      // 127.0.0.1 (não "localhost"): no Windows, "localhost" pode resolver para
      // IPv6 (::1) e o proxy pendura ao alcançar o backend do Docker. Forçar IPv4.
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
    },
  },
  build: { outDir: "dist" },
  optimizeDeps: {
    include: ["react-force-graph-3d", "three"],
  },
});
