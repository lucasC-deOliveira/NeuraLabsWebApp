# `contracts/` — o contrato da API, escrito uma vez

Schemas zod que descrevem o **payload das rotas**: estrutura + invariantes de domínio
(ex.: título de baralho de 1 a 120 caracteres). São a fonte única da regra que atravessa
o fio, consumida pelas duas pontas.

## O que é e o que não é

| | mora aqui | não mora aqui |
|---|---|---|
| Estrutura do body/resposta de uma rota | ✅ | |
| Invariante de domínio que o servidor cobra (max 120) | ✅ | |
| Mensagem pt-BR do erro que o usuário lê | ✅ (o servidor a devolve) | |
| Quais campos aparecem por tipo de card/nó | | ❌ é UX de formulário |
| Regra que só existe na tela (confirmar senha) | | ❌ é UX de formulário |

A UX do formulário continua em `src/modules/*/domain/services/*-schema.ts`. Ela **deriva**
os invariantes daqui (`.extend`/`.merge`), para que o limite do servidor vire erro de campo
em vez de um 400 inesperado.

## Quem pode importar

Só as **bordas** dos dois lados:

- backend: `interface/` (controllers, pipes)
- frontend: `src/lib/*-api.ts` (a fachada HTTP)

O `domain/` de nenhum dos lados importa daqui — a regra de dependência continua apontando
para dentro, como manda o `AGENTS.md`.

## Como importar (a assimetria é proposital)

**Frontend** — alias `@contracts/*` (`tsconfig.json` + `vite.config.ts`):

```ts
import { createBaralhoContract } from "@contracts/baralhos";
```

**Backend** — caminho **relativo**, sem alias:

```ts
import { createBaralhoContract } from '../../../../../contracts/baralhos';
```

Isso é feio de propósito. O `tsc` **não reescreve** path aliases no JS emitido: um
`@contracts/...` compilaria e explodiria em runtime com `Cannot find module`. Resolver isso
exigiria `tsconfig-paths` ou `tsc-alias` — dependência a mais para o build do Nest. O import
relativo sobrevive à compilação porque o `rootDir: ".."` preserva a estrutura: o caminho vale
igual em `backend/src/...` e em `dist/backend/src/...`.
