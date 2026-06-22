import { defineConfig, configDefaults } from "vitest/config";

// Config de teste UNITÁRIA do backend (NestJS). Sem isso, o vitest sobe até a
// config da raiz (SPA) e usa includes errados.
// Testes de integração (*.int.spec.ts) ficam em vitest.integration.config.ts
// (precisam de banco) e são excluídos daqui para o `npm test` rodar sem DB.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: [...configDefaults.exclude, "**/*.int.spec.ts"],
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
