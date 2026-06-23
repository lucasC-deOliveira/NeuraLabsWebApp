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
    "src/modules/study/domain/value-objects/grade.ts",
    "src/modules/study/domain/value-objects/phase.ts",
    "src/modules/study/domain/value-objects/ease-factor.ts",
    "src/modules/study/domain/entities/flashcard.ts",
    "src/modules/study/domain/entities/study-session.ts",
    "src/modules/study/domain/entities/review.ts",
    "src/modules/study/application/use-cases/submit-review.use-case.ts",
    "src/modules/study/application/use-cases/start-session.use-case.ts",
    "src/modules/study/application/use-cases/finalize-session.use-case.ts",
    "src/modules/study/application/use-cases/sync-vault-log.use-case.ts",
    "src/modules/graph/domain/services/relation-rules.ts",
    "src/modules/graph/domain/services/domain-propagation.ts",
    "src/modules/graph/domain/value-objects/edge-weight.ts",
    "src/modules/graph/application/use-cases/create-edge.use-case.ts",
    "src/modules/graph/application/use-cases/update-edge.use-case.ts",
    "src/modules/graph/application/use-cases/delete-edge.use-case.ts",
    "src/modules/graph/application/use-cases/add-existing-node.use-case.ts",
    "src/modules/graph/application/use-cases/remove-node.use-case.ts",
  ],
  reporters: ["clear-text", "progress", "html"],
  thresholds: { high: 85, low: 70, break: 70 },
};
