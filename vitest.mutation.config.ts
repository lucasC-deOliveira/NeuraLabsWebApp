import { defineConfig } from "vitest/config";
import path from "node:path";

// Config dedicada à mutação (Stryker). Roda APENAS a lógica pura (*.spec.ts no
// ambiente node) — sem o projeto jsdom de componentes. Todos os arquivos do
// `mutate[]` do stryker.config são cobertos por specs node, então o score não
// muda; excluir o jsdom (que não cobre lógica) evita um dry-run de centenas de
// testes de componente e mantém a mutação rápida (~min em vez de ~h).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
