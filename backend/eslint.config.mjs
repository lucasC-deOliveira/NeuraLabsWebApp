import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Estratégia de ratchet:
//  - baseline (recomendado) em todo src/** → roda como RELATÓRIO no CI (legado tem dívida).
//  - regras ESTRITAS só em src/modules/** (código novo do refactor) → BLOQUEANTE no CI.
//  - eslint-config-prettier por último: desliga regras de formatação (quem formata é o Prettier).
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'reports/**', '.stryker-tmp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Código novo (hexagonal): clean code obrigatório.
  {
    files: ['src/modules/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 20],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      complexity: ['error', 10],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'variableLike', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
      ],
    },
  },

  // Testes: afrouxa o estrito (mocks/fixtures podem usar any/funções grandes).
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
    },
  },

  prettier,
);
