# Plano de Arquitetura — Clean Code · Hexagonal · Clean Architecture · DDD · TDD

> Escopo: **backend** (NestJS) como foco principal; clean code também no frontend.
> Status: **Fase 0 e Fase 1 (piloto `study`) concluídas** (submit-review + start-session
> em DDD: VOs, agregados, repos por agregado + UoW, e2e, mutação). Fases 2…N pendentes.
> Nenhuma fase começa sem a anterior 100%.

## 1. Princípios
- **Clean Code:** funções pequenas, nomes intencionais (linguagem ubíqua), sem `any`, early-return, sem código morto; comentário explica o *porquê*.
- **Hexagonal (Ports & Adapters):** o núcleo define *interfaces* (ports); Prisma/OpenAI/HTTP são *adapters* plugáveis.
- **Clean Architecture (regra de dependência):** dependências apontam para dentro — `domain ← application ← infrastructure/interface`.
- **DDD:** o código reflete o domínio — subdomínios, bounded contexts, agregados, linguagem ubíqua.
- **TDD:** Red → Green → Refactor. Teste falhando primeiro, implementação depois; mutação garante que o teste tem valor.

---

## 2. DDD Estratégico — subdomínios e bounded contexts
Mapeamento dos módulos atuais para contextos delimitados:

| Bounded Context | Tipo | Módulos atuais | Núcleo? |
|---|---|---|---|
| **Spaced Repetition / Estudo** | Core | `study` (SM-2, interleaving) | ⭐ diferencial |
| **Knowledge Graph** | Core | `graph` (relation-rules, knowledge-graph) | ⭐ diferencial |
| **Notas (Zettelkasten)** | Supporting | `notes` | |
| **Ingestão de Conteúdo** | Supporting | `content` (flashcard-gen, pdf/docx) | |
| **Avaliação** | Supporting | `provas`, `questions` | |
| **Identidade** | Generic | `auth` | |
| **IA / LLM** | Generic (ACL) | `ai` | adapter externo |
| **Configurações** | Generic | `settings` | |

- **Context map:** contextos se comunicam por interfaces publicadas (ports), nunca importando entidades internas uns dos outros. O `ai` é um **subdomínio genérico** acessado via **Anti-Corruption Layer** (port `LlmPort` + adapter OpenAI que traduz para a linguagem do domínio).
- Regra reforçada por fitness function: **um contexto não importa o `domain/` de outro contexto**.

## 3. Linguagem ubíqua (glossário — base, a expandir)
Termos do domínio (PT), usados em código, testes e conversa:

- **Flashcard** — par pergunta/resposta; *aggregate root* do estudo.
- **Baralho** — coleção de flashcards.
- **Conceito** — nó de conhecimento associado a flashcards.
- **AprendizadoFlashcard** — estado de agendamento de um flashcard p/ um usuário (parte do agregado).
- **SessãoEstudo** — *aggregate root*; agrupa revisões num período.
- **RevisãoFlashcard** — evento de uma resposta numa sessão.
- **Fase** — `LEARN` · `REVIEW` · `RELEARN` (Value Object).
- **Grade** — `again` · `hard` · `good` · `easy` (Value Object).
- **EaseFactor / Intervalo / ScheduleState** — Value Objects do SM-2.
- **Nota (Zettelkasten)** — com papel × subtipo de conteúdo ortogonais.
- **Grafo de Conhecimento** — nós (8 tipos) e arestas (regras em `relation-rules`).

## 4. DDD Tático — building blocks
- **Entities:** identidade própria (Flashcard, SessãoEstudo, Nota).
- **Value Objects:** imutáveis, sem identidade (Grade, Fase, ScheduleState, EaseFactor) — validam invariantes na construção.
- **Aggregates + Aggregate Root:** definem **fronteira transacional**. Ex.: `Flashcard` (raiz) + seu `Aprendizado`; `SessãoEstudo` (raiz) + `Revisões`.
- **Domain Services:** lógica que não pertence a uma entidade só — ex.: o **scheduler SM-2** (`spaced-repetition.ts` vira `domain/services`).
- **Repositories:** **um por aggregate root** (não por tabela) — são os *ports*. Ex.: `FlashcardRepository`, `StudySessionRepository`.
- **Domain Events:** ex.: `ReviewSubmitted`, `CardGraduated` — abrem espaço p/ reações desacopladas (estatísticas, grafo) sem acoplar use-cases.
- **Factories:** construção consistente de agregados.

## 5. Estrutura alvo (por bounded context)
```
modules/<context>/
  domain/          entities/ · value-objects/ · services/ (SM-2…) · events/ · ports/ (interfaces de repos e gateways)
  application/     use-cases/ (orquestra; só depende de ports e domínio)
  infrastructure/  persistence/ (prisma-*.repository + mappers Prisma⇄domínio) · llm/ (openai.adapter = ACL)
  interface/       *.controller.ts (HTTP) · dto/
  <context>.module.ts   ← binding port→adapter via injection tokens (@Inject(FLASHCARD_REPOSITORY))
```
**Regra de dependência:** `domain/` não importa `@prisma/client`, `openai`, `@nestjs/*` nem `infrastructure/`. Use-cases dependem só de ports.

---

## 6. TDD — como trabalhamos
**Ciclo Red→Green→Refactor** em toda regra de domínio e caso de uso:
1. **Red:** escrever o teste que descreve o comportamento esperado (falha).
2. **Green:** implementação mínima p/ passar.
3. **Refactor:** limpar mantendo verde.

- **Onde TDD é obrigatório:** `domain/` (entidades, VOs, services como SM-2 e relation-rules) e `application/` (use-cases). É onde mora a lógica e o risco.
- **Mutation testing** valida que os testes do ciclo realmente *matam mutantes* (não são fachada).
- **Ordem nas fases:** dentro de cada módulo, os testes de domínio/use-case vêm **antes** dos adapters.

## 7. Estratégia de testes (pirâmide)
| Camada | Tipo | Ferramenta | Cobre |
|---|---|---|---|
| `domain/` | **Unidade** (puro, sem I/O) | Vitest | SM-2, interleaving, relation-rules, VOs, entidades |
| `application/` | **Unidade** (ports mockados) | Vitest | use-cases (orquestração) |
| `infrastructure/` + use-case real | **Integração** | Vitest + Postgres efêmero (service container / testcontainers) | repositórios Prisma, mappers, transações |
| `interface/` | **E2E** | `@nestjs/testing` + supertest | rotas HTTP, auth, validação DTO |
| `domain/` + `application/` | **Mutação** | **Stryker** | qualidade dos testes na lógica crítica |

**Limiares (bloqueantes no CI):** cobertura mínima em `domain`/`application` + **mutation score mínimo** (ex.: `break: 70`).

## 8. Enforcement — obrigar o LLM (e qualquer dev) a seguir
A arquitetura e o TDD viram **código verificável**, não pedido educado:

1. **Invariantes no `AGENTS.md`/`CLAUDE.md`** (o agente lê antes de codar), ex.:
   - "`domain/` nunca importa `@prisma/client`, `openai`, `@nestjs/*` nem `infrastructure/`."
   - "Use-cases dependem só de ports."
   - "Um contexto não importa o `domain/` de outro."
   - "Nova regra de domínio/caso de uso **começa por um teste que falha** (TDD); PR sem teste correspondente é rejeitado."
2. **Fitness functions de fronteira** — `dependency-cruiser` (ou `eslint-plugin-boundaries`) com regras que **falham o build** em import proibido (entre camadas e entre contextos). Roda no CI como gate bloqueante.
3. **Test-first checado:** script no CI que exige spec correspondente para arquivos novos em `domain/`/`application/` + **threshold de mutação e cobertura**. Aproxima a obrigação de TDD de forma automática.
4. **CI bloqueante + branch protection:** nenhum PR (inclusive de IA) entra sem: build, unidade, integração, e2e, boundary-check, mutação e cobertura verdes.
5. **(Opcional) hook do Claude Code** (`Stop`/`PostToolUse`): roda boundary-check + testes do módulo tocado *durante* a sessão, dando feedback ao agente antes do CI.

---

## 9. Fases (milestone — "Done when" obrigatório)
**Fase 0 — Trilhos e barreiras (sem mudar comportamento)**
Criar pastas das camadas; `dependency-cruiser` + regras de fronteira; Stryker no backend; thresholds de cobertura; invariantes (DDD/TDD/camadas) no `AGENTS.md`; checagem test-first; ligar gates no `ci.yml`.
*Done when:* CI reprova um import proibido proposital e um arquivo de domínio novo sem spec.

**Fase 1 — Piloto: contexto `study` (referência), via TDD** ✅ **CONCLUÍDA**
Linguagem ubíqua → VOs (Grade, Fase, ScheduleState) e entidades (Flashcard, SessãoEstudo) com testes primeiro; SM-2 vira `domain/services`; ports `FlashcardRepository`/`StudySessionRepository`; adapters Prisma + mappers; use-cases `SubmitReview`/`StartSession`.
*Done when:* boundary verde; unidade+integração+e2e passam; mutation ≥ limiar; **sem regressão de comportamento**.
*Entregue:* VOs com validação; agregados Flashcard/StudySession+Review; repos por agregado + `StudyUnitOfWork`; read model `StudyCardQuery`; filtro de erros na interface; e2e via supertest; mutação 100% em VOs/entidades, 94–100% nos use-cases. (Domain Events ficaram deferidos — não exigidos pelo Done-when.)

**Fases 2…N — Replicar por contexto:** `graph` → `ai` (LlmPort/ACL OpenAI) → `content` → `notes` → `provas`/`questions` → `auth`/`settings`. Cada um com TDD e a pirâmide.

**Fase final — Apertar:** zerar os 345 erros de ESLint e tornar o lint bloqueante (`--max-warnings 0`); subir thresholds de mutação/cobertura.

## 10. Decisões em aberto (recomendações)
- **Sequência:** piloto no `study` primeiro *(recomendado)* vs. tudo de uma vez.
- **Mapeamento:** entidades de domínio + mappers *(recomendado — Clean/DDD de verdade)* vs. reusar tipos do Prisma.
- **Boundary tool:** `dependency-cruiser` *(recomendado — expressivo p/ camadas e contextos)* vs. `eslint-plugin-boundaries`.
- **DB de integração:** Postgres service container no GitHub Actions *(recomendado)* vs. testcontainers.

## 11. Comandos (alvo)
```bash
# backend
npm ci && npx prisma generate
npm run build
npm test                 # unidade + integração
npm run test:e2e         # e2e (a criar)
npm run test:mutation    # Stryker (a criar)
npm run arch:check       # dependency-cruiser (a criar)
```
