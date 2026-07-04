# Arquitetura do frontend

Mapa de orientação rápida. As **regras** (tamanho de função, gates, etc.) estão no
[`AGENTS.md`](AGENTS.md); aqui está o **como as peças se encaixam**.

SPA **Vite + React 19 + react-router v7** (HashRouter). Dados vêm do backend NestJS
via REST. Cada _feature_ é um **bounded context hexagonal** em `src/modules/<contexto>/`.

## Anatomia de um módulo

```
src/modules/<contexto>/
  domain/          Lógica pura: tipos, regras, serviços. Sem React, sem @/lib. Testado com *.spec.ts.
  application/
    ports/         Interfaces que a presentation consome (ex.: FooPort). Sem implementação.
    use-cases/     Orquestram domínio + ports (recebem ports por parâmetro). Testado com fakes nomeados.
  infra/http/      Adapters que implementam os ports sobre @/lib/*-api (Anti-Corruption Layer).
                   Expõe um singleton `<contexto>Http` (ex.: fooHttp) via index.ts.
  presentation/    Componentes/hooks React. A página em src/app/** é fina (só re-export).
```

**Regra de dependência (só estas setas):**

```
presentation ─▶ application (ports/use-cases) ─▶ domain
      │                                            ▲
      └────────────▶ infra/http ──────────────────┘   (compõe o port; implementa via @/lib/*-api)
```

- `domain` e `application` são **puros** — não importam React nem `@/lib/*-api`.
- `@/lib/*-api` (a borda HTTP) **só** é importado pela camada `infra/` de cada módulo.
- `presentation` chama **use-cases/ports** (nunca `@/lib/*-api` direto); pode compor o singleton `*Http`.

Enforçado por `npm run arch:check` (dependency-cruiser) e `npm run lint:strict`.

## Mapa dos módulos

| Módulo | Responsabilidade | Borda (`@/lib`) | Port(s) principais |
|---|---|---|---|
| `auth` | login/registro | `api` (authApi) | `AuthPort` |
| `settings` | config de IA + tema | `settings-api` | `SettingsPort` |
| `questions` | banco de questões | `questions-api` | `QuestionsPort` |
| `provas` | provas (compõe questões) | `provas-api` | `ProvasPort` |
| `study` | sessão de estudo (SRS) | `study-api` | `StudySessionPort` |
| `notes` | notas Zettelkasten | `notes-api`, `ai-api`, `content-api` | `NotesPort`, `NotaAiPort` |
| `flashcards` | flashcards + geração | `content-api`, `notes-api`, `ai-api` | `FlashcardsPort`, `FlashcardGenPort` |
| `content` | **shared kernel**: hierarquia de conceitos + staging | `content-api` | `ContentPort` |
| `dashboard` | home (KPIs, matérias, atividade) | `content-api` | `DashboardPort` |
| `graph` | grafo de conhecimento (render, hooks, IA) | `graph-api`, `ai-api` | `graphHttp` compõe ~10 ports |
| `vr` | render XR do grafo (Three.js/r3f) | via `graph` | — (consome `graphHttp`) |

## Exceções cross-context (deliberadas, documentadas)

A regra geral: **um módulo não importa o domínio de outro**. Três exceções, todas por
composição/rendering real (não acoplamento acidental), encodadas em `.dependency-cruiser.cjs`:

- **`vr → graph`** — vr é um _renderizador 3D alternativo_ do grafo, não um contexto próprio.
- **`provas → questions`** — uma prova é um _agregado composto_ de questões.
- **`content` é shared kernel** — a hierarquia de conceitos é usada por `notes` **e**
  `flashcards`; qualquer módulo pode consumir `content/` (exempto do `sem-cruzar-contexto`).

## Padrões recorrentes (o _porquê_)

Convenções que caem em toda tela — documentadas pra não redescobrir por tentativa e erro:

- **Estado fica no `.tsx`.** Componentes com muito estado mantêm `useState` no componente
  (isento do cap de 20 linhas/função) e extraem a _view_ em subcomponentes "burros" por props.
- **`set-state-in-effect` (react-hooks estrito):** proibido `setState` síncrono no corpo de
  um effect. Padrão: `loading` já inicia `true`, o fetch dispara **síncrono** no effect e o
  estado assenta nos callbacks (`.then/.finally`). Preserva testes que asseguram a chamada
  síncrona no mount.
- **`react-hooks/purity`:** `Date.now()`/`new Date()` proibidos em render/handler. Domínio
  recebe `now` por **parâmetro** (`fn(x, now = ...)`) — o default roda dentro do módulo de
  domínio (puro no call-site). Presentation usa helpers de `@/lib/clock` e `@/lib/id`.
- **`useRouter` retorna objeto novo a cada render** → effects de _load-by-id_ usam
  `// eslint-disable-next-line react-hooks/exhaustive-deps` com deps `[id]`.
- **Páginas finas:** `src/app/**/page.tsx` é só `export { X as default } from "@/modules/..."`.

## Testes

- `*.spec.ts` → lógica pura (vitest `node`); `*.test.tsx` → componentes/hooks (`jsdom` +
  `@testing-library/react`).
- I/O externo é mockado por **classes fake nomeadas** que implementam os ports
  (ex.: `FakeContentPort`), nunca stub inline.
- Verificação de runtime: drivers Playwright dirigem o app real (Vite + backend Docker).
