import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// Estratégia de ratchet (espelha o backend):
//  - baseline (recomendado) em todo o repo → frouxo, p/ o legado em src/{app,components,lib}.
//  - regras ESTRITAS só em src/modules/** (código hexagonal) → bloqueante via `lint:strict`.
//  - .ts (domain/application/infra/hooks/controllers): clean code pleno (funções ≤20 linhas).
//  - .tsx (componentes React): JSX é verboso, então não há cap por função; o que segura
//    god-components é max-lines (500/arquivo) + complexity. Tipos/naming continuam estritos.
//
// STRICT_DEBT: arquivos de src/modules extraídos numa passada anterior (graph/vr), ainda
// fora do padrão estrito. Ficam ISENTOS (bloco de dívida no fim) e são removidos da lista
// conforme a Fase 1 os refatora. Todo arquivo NOVO em src/modules já nasce sob o gate.
const STRICT_DEBT = [
  "src/modules/graph/domain/services/roadmap.service.ts",
  "src/modules/graph/infra/layout/force-layout.engine.ts",
  "src/modules/graph/presentation/components/Graph3DRenderer.tsx",
  "src/modules/graph/presentation/components/GraphRenderer.tsx",
  "src/modules/graph/presentation/components/GraphSettingsModal.tsx",
  "src/modules/graph/presentation/components/GraphSideToolbar.tsx",
  "src/modules/graph/presentation/components/RoadmapPanel.tsx",
  "src/modules/graph/presentation/controllers/useGraphController.ts",
  "src/modules/graph/presentation/hooks/useGraphData.ts",
  "src/modules/graph/presentation/hooks/useGraphInteractions.ts",
  "src/modules/graph/presentation/hooks/useGraphLayout.ts",
  "src/modules/graph/presentation/hooks/useGraphSearch.ts",
  "src/modules/graph/presentation/hooks/useVaultWatch.ts",
  "src/modules/graph/presentation/services/graph-physics.service.ts",
  "src/modules/graph/presentation/workers/graph-render.worker.ts",
  "src/modules/vr/components/VRContentPanel3D.tsx",
  "src/modules/vr/components/VRContentViewer.tsx",
  "src/modules/vr/components/VREditForm.tsx",
  "src/modules/vr/components/VREditPanel3D.tsx",
  "src/modules/vr/components/VRGraph.tsx",
  "src/modules/vr/components/VRPanel3D.tsx",
  "src/modules/vr/components/VRScene.tsx",
  "src/modules/vr/components/VRStudyMode.tsx",
  "src/modules/vr/components/VRStudyPanel3D.tsx",
  "src/modules/vr/vr-panel.helpers.ts",
];

const STRICT_TS_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "error",
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "max-lines-per-function": ["error", { max: 20, skipBlankLines: true, skipComments: true }],
  "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
  "max-depth": ["error", 2],
  "max-nested-callbacks": ["error", 2],
  complexity: ["error", 10],
  "@typescript-eslint/naming-convention": [
    "error",
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: "variableLike",
      format: ["camelCase", "PascalCase", "UPPER_CASE"],
      leadingUnderscore: "allow",
    },
  ],
};

// .tsx: componentes React. Sem cap por função (JSX), sem return type explícito
// (idiomático inferir JSX.Element). Mantém tamanho de arquivo, complexidade, tipos e naming.
const STRICT_TSX_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
  complexity: ["error", 12],
  "@typescript-eslint/naming-convention": [
    "error",
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: "variableLike",
      format: ["camelCase", "PascalCase", "UPPER_CASE"],
      leadingUnderscore: "allow",
    },
  ],
};

// Regras desligadas para o legado-em-modules (STRICT_DEBT). Inclui as estritas e as
// react-hooks que o repo já tolera no `lint` baseline — serão religadas arquivo a
// arquivo conforme a Fase 1 limpa cada um (retirando-o de STRICT_DEBT).
const DEBT_RULES_OFF = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-unused-expressions": "off",
  "@typescript-eslint/naming-convention": "off",
  "max-lines-per-function": "off",
  "max-lines": "off",
  "max-depth": "off",
  "max-nested-callbacks": "off",
  complexity: "off",
  "react-hooks/refs": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/exhaustive-deps": "off",
  "react-hooks/immutability": "off",
};

export default tseslint.config(
  { ignores: ["dist/**", "dist-electron/**", "build/**", "backend/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Código hexagonal: gate estrito (bloqueante via `lint:strict`).
  {
    files: ["src/modules/**/*.ts"],
    ignores: ["**/*.spec.ts"],
    rules: STRICT_TS_RULES,
  },
  {
    files: ["src/modules/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    rules: STRICT_TSX_RULES,
  },

  // Testes: afrouxa o estrito (mocks/fixtures/JSX de teste).
  {
    files: ["**/*.spec.ts", "**/*.test.tsx", "test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "max-depth": "off",
      complexity: "off",
    },
  },

  // Dívida do legado-em-modules: isenta até a Fase 1 limpar (bloco por último = vence).
  // reportUnusedDisableDirectives off: esses arquivos têm eslint-disable inline p/
  // regras que aqui desligamos — sem isso virariam "unused directive".
  {
    files: STRICT_DEBT,
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: DEBT_RULES_OFF,
  },
);
