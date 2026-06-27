import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

// Visual regression — roda num browser REAL (Playwright/Chromium) com layout e CSS
// de verdade, comparando screenshots (`toMatchScreenshot`). Separado do `npm test`
// (jsdom, rápido): rode com `npm run test:visual`. Use só nas telas/modais-chave;
// mocke o canvas 3D (three/xyflow) que não é determinístico.
//
// BASELINES são por-plataforma (ex.: `*-chromium-win32.png`) — a renderização muda
// entre OS. As baselines commitadas são geradas no Windows (dev local); um job de CI
// em Linux precisa gerar/usar baselines próprias (idealmente via Docker no mesmo OS).
// Atualizar baselines após mudança intencional: `npm run test:visual -- --update`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    name: "visual",
    include: ["src/**/*.visual.test.tsx", "test/**/*.visual.test.tsx"],
    setupFiles: ["./test/setup-visual.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
