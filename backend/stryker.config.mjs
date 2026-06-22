// Mutation testing do backend — foca na lógica de DOMÍNIO pura (alto risco,
// alto valor). Roda contra os testes unitários (vitest.config.ts, que exclui
// integração). Valida que os testes realmente "matam mutantes", não só cobrem.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  coverageAnalysis: "perTest",
  mutate: [
    "src/modules/study/domain/services/spaced-repetition.ts",
    "src/modules/study/domain/services/interleaving.ts",
  ],
  reporters: ["clear-text", "progress", "html"],
  thresholds: { high: 85, low: 70, break: 70 },
};
