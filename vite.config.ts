import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Caminhos relativos: necessário para o app abrir via file:// no Electron.
  base: "./",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  // strictPort: o electron:dev aponta fixo p/ :3000; falha em vez de driftar.
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist" },
});
