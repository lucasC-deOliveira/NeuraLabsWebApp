# Contribuindo — padrão de engenharia

Antes de abrir PR, **todos os gates bloqueantes** devem passar. O CI
(`.github/workflows/ci.yml`) aplica os mesmos checks automaticamente.

## Gates bloqueantes

### Frontend (raiz)
```bash
npx tsc --noEmit      # typecheck, sem erros
npx vitest run        # testes (400+ casos)
```

### Backend (`backend/`)
```bash
npx prisma generate   # gera o client
npm run build         # nest build sem erros
npm test              # testes (vitest)
```

### Segredos
O CI roda **gitleaks** em todo push/PR. Não comite segredos; `.env*` ficam fora do versionamento.

## Gate não-bloqueante (por enquanto)

- **ESLint:** `npx eslint .` — hoje tem ~345 erros legados (`no-explicit-any`,
  `react-hooks/*`, `no-unused-vars`). Roda como **relatório** no CI. A meta é zerar
  incrementalmente e então remover o `continue-on-error` do job `quality` para
  torná-lo bloqueante (`npx eslint . --max-warnings 0`).
- **`npm audit --audit-level=high`** — relatório de vulnerabilidades de dependências.

## Convenções

- **Testes antes de declarar pronto**, com foco em lógica pura: SM-2, regras de
  relação do grafo (`backend/src/graph/relation-rules.ts`), serviços de IA/auth.
- **Sem código morto / features pela metade.**
- **Comentários explicam o *porquê*, não o *o quê*.**
- **Arquitetura** (ver [AGENTS.md](AGENTS.md)): SPA Vite não acessa o banco — só REST
  via `src/lib/*-api.ts`; lógica de servidor/Prisma só no `backend/` (NestJS).
- **SemVer:** breaking changes só em major.

## Rodar tudo localmente (atalho)
```bash
# frontend
npm ci && npx tsc --noEmit && npx vitest run
# backend
cd backend && npm ci && npx prisma generate && npm run build && npm test
```
