/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
  },

  // Mutate only pure-logic files where mutation testing gives real value.
  // Skipping DB/IO-heavy server actions (false-negative rate is too high there).
  mutate: [
    "src/lib/auth.ts",
    "src/lib/rate-limit.ts",
    "proxy.ts",
    "src/app/api/auth/google/route.ts",
    "src/app/api/auth/google/callback/route.ts",
    "src/modules/study/domain/services/spaced-repetition.ts",
    "src/modules/study/domain/services/interleaving.ts",
    "src/modules/notas/domain/services/nota-concept-matcher.ts",
    "src/modules/notas/domain/services/nota-parser.ts",
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
