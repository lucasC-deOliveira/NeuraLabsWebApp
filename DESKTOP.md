# Versão desktop (Electron)

A app é empacotada como desktop rodando o servidor Next (build `standalone`) dentro
de um processo Node próprio, com o Electron abrindo uma janela em `http://127.0.0.1:<porta>`.

## Como funciona

- `next.config.ts` usa `output: "standalone"` → gera `.next/standalone/server.js`.
- `electron/main.js` (processo principal):
  - cria/usa o banco SQLite em `userData/app.db` (copiado do template no 1º boot);
  - gera um `JWT_SECRET` por instalação, salvo em `userData/config.json`;
  - faz `fork` do `server.js` com as variáveis de ambiente corretas, espera a porta
    responder e abre a janela.
- O Prisma usa engines nativos por plataforma (`binaryTargets` em `schema.prisma`):
  `native` (dev), `debian-openssl-3.0.x` (Linux) e `windows`.
- **Nenhum segredo vai no build.** A chave da OpenAI é configurada pelo usuário em
  `/settings` e fica no banco local.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run electron:dev` | Abre o Electron apontando para `next dev` (rode `npm run dev` antes). |
| `npm run desktop:build` | `next build` (standalone) + copia static/public + gera `build/app.db`. |
| `npm run desktop:dist` | Build + empacota instaladores para a plataforma atual (sem publicar). |
| `npm run desktop:publish` | Build + empacota e **publica** a Release no GitHub. |

Artefatos saem em `dist-electron/` (Windows: `.exe` NSIS; Linux: `.AppImage` e `.deb`).

## Releases automáticas (GitHub Actions)

O workflow `.github/workflows/release.yml` builda em `windows-latest` + `ubuntu-latest`
e publica os instaladores numa Release ao criar uma tag de versão:

```bash
npm version patch        # ou minor/major — cria o commit + tag vX.Y.Z
git push --follow-tags
```

Isso dispara o build cruzado e cria a Release `vX.Y.Z` com os instaladores de Windows e Linux.
Usa o `GITHUB_TOKEN` padrão do Actions (não precisa configurar secret).

## Pendências conhecidas

- **Ícone**: ainda usando o ícone padrão do Electron. Adicione `build/icon.png`
  (≥512×512) e `build/icon.ico` para personalizar.
- **Type-check no build**: há erros de tipo pré-existentes no projeto, então
  `next.config.ts` está com `typescript.ignoreBuildErrors` e `eslint.ignoreDuringBuilds`.
  Convém corrigi-los e reativar.
