import { defineConfig } from "vitest/config";

// Config de INTEGRAÇÃO: roda apenas *.int.spec.ts e carrega o .env.test
// (banco neuralabs_test). Requer o Postgres de teste no ar.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.int.spec.ts"],
    setupFiles: ["./test/setup-env.ts"],
    // Integração toca o banco: sem paralelismo entre arquivos para evitar
    // corrida no TRUNCATE compartilhado.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
