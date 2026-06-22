import { defineConfig } from "vitest/config";

// Config E2E: roda apenas *.e2e.spec.ts. Sobe a app Nest real (supertest) contra
// o banco de teste (neuralabs_test) carregando .env.test. Requer o Postgres no ar.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.e2e.spec.ts"],
    setupFiles: ["./test/setup-env.ts"],
    // E2E toca o banco e sobe a app: sem paralelismo entre arquivos.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
