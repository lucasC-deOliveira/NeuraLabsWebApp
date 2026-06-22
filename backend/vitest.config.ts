import { defineConfig } from "vitest/config";

// Config de teste isolada do backend (NestJS). Sem isso, o vitest sobe até a
// config da raiz (SPA) e usa includes errados.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    env: {
      JWT_SECRET: "vitest-test-secret-not-for-production",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.d.ts",
        "src/main.ts",
        "src/**/*.module.ts",
      ],
    },
  },
});
