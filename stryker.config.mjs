/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: {
    // Config dedicada: só o projeto de lógica (*.spec.ts, node). O vitest.config
    // principal tem 2 projetos (node + jsdom); rodar o jsdom no dry-run da mutação
    // deixaria cada run em horas. Ver vitest.mutation.config.ts.
    configFile: "vitest.mutation.config.ts",
  },

  // Mutate only pure-logic files where mutation testing gives real value.
  // Skipping DB/IO-heavy server actions (false-negative rate is too high there).
  mutate: [
    "src/lib/vault-format.ts",
    "src/lib/graph-communities.ts",
    "src/lib/graph-metrics.ts",
    "src/lib/srs-local.ts",
    "src/modules/graph/domain/services/relation-rules.ts",
    "src/modules/graph/domain/services/roadmap.service.ts",
    "src/modules/graph/domain/selectors/graph.selectors.ts",
    "src/modules/graph/presentation/services/graph-style.service.ts",
    "src/modules/graph/presentation/services/graph-physics.service.ts",
    "src/modules/graph/infra/layout/force-layout.engine.ts",
    "src/components/flashcard/card-styles.ts",
  ],

  // Run only the specs that cover the mutated files.
  // This dramatically reduces runtime compared to running the full suite.
  coverageAnalysis: "perTest",

  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },

  reporters: ["progress", "html", "clear-text"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },

  timeoutMS: 10000,
  concurrency: 4,
};
