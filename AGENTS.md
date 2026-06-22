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

# Regras de engenharia (obrigatórias no refactor)

Estas regras valem para humanos E agentes. Violá-las = PR rejeitado. Onde dá,
são enforçadas por ferramenta (CI); o resto é checado em revisão.

| # | Regra | Como aplicar | Enforce |
|---|---|---|---|
| 1 | **Funções pequenas** | uma função faz uma coisa; extraia ao crescer | ESLint `max-lines-per-function`, `complexity`, `max-statements` |
| 2 | **SRP** | uma responsabilidade por classe/módulo/use-case (1 use-case por arquivo) | revisão + fronteiras (dependency-cruiser) |
| 3 | **Nomes significativos e únicos** | linguagem ubíqua do domínio; sem abreviação obscura; sem dois nomes p/ a mesma coisa | ESLint `@typescript-eslint/naming-convention` + revisão |
| 4 | **Comentários com contexto** | explique o *porquê*/decisão; nunca descreva o óbvio | revisão |
| 5 | **Tipos explícitos** | retorno e fronteiras tipados; **proibido `any`** | `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any` |
| 6 | **DRY** | extraia lógica repetida; uma fonte de verdade | revisão (+ `sonarjs` opcional) |
| 7 | **Estrutura de diretórios previsível** | sempre `domain/ application/ infrastructure/ interface/` por contexto | dependency-cruiser (camadas) |
| 8 | **Evitar aninhamento profundo** | early-return / guard clauses | ESLint `max-depth`, `max-nested-callbacks` |
| 9 | **Dependency Injection** | dependa de *ports* (interfaces), nunca de implementações concretas; binding via tokens NestJS | revisão + fronteiras |
| 10 | **Testabilidade** | DI + lógica pura no domínio → testável sem mock pesado; cobre com a pirâmide | thresholds de cobertura + mutação |
| 11 | **Erros com contexto** | exceções tipadas com mensagem clara + `cause`/dados relevantes; nunca engolir erro silenciosamente | revisão |
| 12 | **Formatação e estilo padrão** | seguir o linter/formatter mais popular do TS: **Prettier** (formatação) + **ESLint/typescript-eslint** (estilo). Sem estilo manual divergente | `prettier --check` + `eslint` no CI |

Princípio TDD: **regra de domínio/use-case nova começa por um teste que falha** (Red→Green→Refactor); PR sem teste correspondente é rejeitado.
