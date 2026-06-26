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
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/main.tsx",
        // Componentes puros de react-three-fiber (WebGL): não montam em jsdom e um
        // smoke só verificaria o mock, não o render real. Excluídos da métrica —
        // como o backend exclui IO-heavy da mutação. A cobertura real virá quando o
        // vr for refatorado (extrair lógica p/ hooks/serviços testáveis).
        "src/modules/vr/components/VRScene.tsx",
        "src/modules/vr/components/VRGraph.tsx",
        "src/modules/vr/components/VRPanel3D.tsx",
        "src/modules/vr/components/VRContentPanel3D.tsx",
        "src/modules/vr/components/VRStudyPanel3D.tsx",
        "src/modules/vr/components/VREditPanel3D.tsx",
        "src/modules/vr/components/VRStudyMode.tsx",
      ],
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
