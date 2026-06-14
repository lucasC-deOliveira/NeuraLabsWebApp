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
