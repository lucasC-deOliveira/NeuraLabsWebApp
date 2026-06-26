import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Dois ambientes por convenção de nome:
//  - *.spec.ts  → lógica pura (environment node), como já era.
//  - *.test.tsx → componentes/hooks React (environment jsdom + testing-library).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.ts", "src/**/*.test.tsx", "src/**/*.d.ts", "src/main.tsx"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "logic",
          environment: "node",
          include: ["src/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "test/**/*.test.tsx"],
          // *.visual.test.tsx casa com *.test.tsx mas roda só no browser mode
          // (vitest.visual.config.ts) — fora do jsdom.
          exclude: ["**/*.visual.test.tsx", "**/node_modules/**"],
          setupFiles: ["./test/setup-dom.ts"],
        },
      },
    ],
  },
});
