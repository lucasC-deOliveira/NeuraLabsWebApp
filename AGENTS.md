# Arquitetura do frontend

Este app é uma **SPA em Vite + React 19 + react-router v7** (HashRouter) — **não é mais Next.js**.
Foi migrado de Next.js: não há SSR, server components, server actions nem roteamento por arquivos.

- Dados vêm do backend NestJS via REST (`src/lib/*-api.ts` → `src/lib/api.ts`, JWT no localStorage).
- Roteamento: rotas declaradas em `src/main.tsx`; páginas em `src/app/**/page.tsx`.
- Compat da migração: `src/lib/navigation.ts` (hooks estilo `next/navigation`) e
  `src/components/link.tsx` (`Link` com `href`). Use-os no lugar de `next/*`.
- Tailwind v4 via `@tailwindcss/vite`. Fontes via `@fontsource-variable/*`.
- Desktop (Electron): `electron/main.js` carrega o build estático (`dist/`) via `file://`.

Não reintroduza dependências do Next (`next`, `eslint-config-next`) nem Prisma/auth
de servidor — essa lógica vive no `backend/` (NestJS).

---

# Regras de engenharia (obrigatórias)

Valem para humanos E agentes. Violá-las = PR rejeitado. Onde há ferramenta, o CI
enforça (escopo estrito em `backend/src/modules/**`; legado é report-only). O resto
é revisão.

## Code style
- Funções: **4–20 linhas**. Maior que isso, divida.
- Arquivos: **< 500 linhas**. Divida por responsabilidade.
- Uma coisa por função; **uma responsabilidade por módulo (SRP)**.
- Nomes específicos e únicos. Evite `data`, `handler`, `Manager`, `service` genérico.
  Prefira nomes que retornem **< 5 hits no grep**. Use a linguagem ubíqua do domínio.
- Tipos **explícitos**. Sem `any`, sem função sem tipo de retorno/fronteira.
- **Sem duplicação** — extraia lógica compartilhada para função/módulo.
- **Early return** em vez de ifs aninhados. **Máx. 2 níveis de indentação.**
- Mensagens de exceção incluem **o valor ofensor e o formato esperado**.
  Ex.: `` throw new Error(`grade inválido: "${g}". Esperado: again|hard|good|easy`) ``.

## Comentários
- **Preserve** os comentários existentes no refactor — carregam intenção/proveniência.
- Escreva o **PORQUÊ**, não o O QUÊ. Nada de `// incrementa contador` sobre `i++`.
- Funções/use-cases públicos: docstring com **intenção + um exemplo de uso**.
- Referencie **issue/commit SHA** quando a linha existe por um bug ou restrição específica.

## Tests
- Comando único por suíte:
  - backend unidade — `npm test` (em `backend/`)
  - backend integração — `npm run test:integration`
  - backend mutação — `npm run test:mutation`
  - frontend — `npm test` (na raiz)
- **Toda função nova tem teste. Todo bug-fix tem teste de regressão.**
- I/O externo (DB, API, filesystem) é mockado por **classes fake nomeadas** que
  implementam os *ports* (ex.: `FakeFlashcardRepository`), nunca stub inline.
- Testes **F.I.R.S.T**: rápidos, independentes, repetíveis, auto-validáveis, no tempo certo.

## Dependencies
- Injete dependências por **construtor/parâmetro** (NestJS DI), nunca por global/import direto.
- Envolva libs de terceiros (**Prisma, OpenAI**) atrás de uma **interface fina (port)**
  deste projeto — só o adapter conhece a lib (Anti-Corruption Layer).

## Structure
- Siga a convenção do framework: **NestJS** no backend, **Vite/React** no frontend.
- Módulos pequenos e focados, não "god files".
- Caminhos previsíveis. No backend refatorado, por bounded context:
  `domain/ application/ infrastructure/ interface/`.

## Formatting
- Use o formatter padrão da linguagem: **Prettier** (`npm run format`). Não discuta
  estilo além disso.

## Logging
- **JSON estruturado** para debug/observabilidade (NestJS `Logger`).
- Texto plano só para saída de CLI voltada ao usuário.

## TDD
- Regra de domínio/use-case nova **começa por um teste que falha** (Red→Green→Refactor).
- PR sem teste correspondente é rejeitado.

## Enforce automático (CI — escopo `backend/src/modules/**`)
| Regra | Gate |
|---|---|
| Funções ≤20 linhas, ≤2 indentação, complexidade | `lint:strict` (`max-lines-per-function`, `max-depth`, `complexity`) |
| Arquivos <500 linhas | `lint:strict` (`max-lines`) |
| Sem `any` / tipos explícitos | `lint:strict` (`no-explicit-any`, `explicit-*-types`) |
| Nomes | `lint:strict` (`naming-convention`) + revisão |
| Fronteiras hexagonais / DI por ports | `arch:check` (dependency-cruiser) |
| Formatação | `format:check` (Prettier) |
| Qualidade de teste | `test:mutation` (Stryker, break 70) |
