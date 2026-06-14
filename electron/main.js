// Processo principal do Electron (modelo novo — backend separado).
// O app é um THIN CLIENT: carrega a UI estática (build do Vite) via file:// e a
// página fala com o backend NestJS via JWT. O backend é configurável (config.json)
// e o app hospeda o VAULT: operações de sistema de arquivos (ler/gravar .md) via
// IPC, para edição externa (Obsidian/Claude Code) e sync manual Pull/Push.
const { app, BrowserWindow, shell, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:5173";
const DEFAULT_API_URL = process.env.NEURALABS_API_URL || "http://localhost:3001/api";

// Pastas PARA do vault (espelha src/lib/vault-format.ts).
const PARA_FOLDERS = ["Projects", "Areas", "Resources", "Archives"];

let mainWindow = null;

// ---------------------------------------------------------------------------
// Config persistente (userData/config.json): { apiUrl, vaultPath }
// ---------------------------------------------------------------------------
function configFile() {
  return path.join(app.getPath("userData"), "config.json");
}
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile(), "utf8")) || {};
  } catch {
    return {};
  }
}
function writeConfig(patch) {
  const cfg = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2));
  return cfg;
}
function getApiUrl() {
  return readConfig().apiUrl || DEFAULT_API_URL;
}

// ---------------------------------------------------------------------------
// Janela
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "NeuraLabs",
    icon: path.join(__dirname, "../public/favicon.ico"),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) return { action: "allow" };
    shell.openExternal(target);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

async function boot() {
  try {
    createWindow();
    if (isDev) {
      await mainWindow.loadURL(DEV_URL);
      return;
    }
    // Build estático do Vite (HashRouter), carregado direto do disco.
    const indexHtml = path.join(process.resourcesPath, "dist", "index.html");
    if (!fs.existsSync(indexHtml)) throw new Error(`UI não encontrada em ${indexHtml}`);
    await mainWindow.loadFile(indexHtml);
  } catch (err) {
    console.error("Falha ao iniciar:", err);
    dialog.showErrorBox("Erro ao iniciar", String(err?.message || err));
    app.quit();
  }
}

// ---------------------------------------------------------------------------
// IPC: backend configurável
// ---------------------------------------------------------------------------
ipcMain.on("neuralabs:get-api-url-sync", (e) => { e.returnValue = getApiUrl(); });
ipcMain.handle("neuralabs:get-api-url", () => getApiUrl());
ipcMain.handle("neuralabs:set-api-url", (_e, url) => {
  if (typeof url === "string" && url.trim()) writeConfig({ apiUrl: url.trim() });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Vault: inicialização (pastas PARA + CLAUDE.md)
// ---------------------------------------------------------------------------
function initVault(dir) {
  const root = path.resolve(dir);
  fs.mkdirSync(root, { recursive: true });
  const claudeMd = path.join(root, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(claudeMd, VAULT_CLAUDE_MD, "utf8");
  }
}

const VAULT_CLAUDE_MD = `# NeuraLabs Vault — instruções para o Claude

Este vault contém o grafo de conhecimento do NeuraLabs exportado como arquivos Markdown.
Cada arquivo \`.md\` representa **um nó** do grafo. Após editar arquivos aqui, abra o
NeuraLabs e clique em **Vault → Pull** no grafo correspondente para sincronizar de volta.

---

## Estrutura de pastas (PARA)

| Pasta | Tipos de nó |
|---|---|
| \`Projects/\` | \`BARALHO\` (decks de flashcard) |
| \`Areas/\` | \`ASSUNTO\` (disciplinas, áreas de estudo) |
| \`Resources/\` | \`TOPICO\`, \`CONCEITO\`, \`NOTA\`, \`FLASHCARD\`, \`TEXTO_BRUTO\` |
| \`Archives/\` | reservado (não edite manualmente) |

---

## Formato de cada arquivo

Todo arquivo começa com um bloco **frontmatter YAML** seguido do corpo em Markdown:

\`\`\`markdown
---
id: "uuid-do-no"
tipo: CONCEITO
grafo: "uuid-do-grafo"
titulo: "Nome do nó"
nivelDominio: 3          # 0–5, opcional
relacoes:
  - rel: PERTENCE_A
    alvo: "[[uuid-do-topico-pai]]"
    peso: 1
  - rel: PREREQUISITO
    alvo: "[[uuid-de-outro-conceito]]"
    peso: 1
---

Corpo do nó em Markdown livre.
\`\`\`

**Regras obrigatórias:**
- \`id\` — nunca altere. É a chave primária no banco.
- \`tipo\` — nunca altere. Define o comportamento do nó.
- \`grafo\` — nunca altere. Identifica a qual grafo pertence.
- \`alvo\` nas relações — sempre no formato \`[[uuid]]\`. Use o \`id\` do nó destino.

---

## Tipos de nó e campos esperados

### ASSUNTO
Área de estudo de nível mais alto (ex: "Algoritmos", "Fisiologia").
- Corpo: descrição opcional em texto livre.

### TOPICO
Subdivisão de um assunto (ex: "Ordenação", "Sistema cardiovascular").
- Corpo: descrição opcional.
- Relações típicas: \`PERTENCE_A\` → ASSUNTO, \`SUBTOPICO_DE\` → TOPICO.

### CONCEITO
Unidade de conhecimento atômica (ex: "QuickSort", "Miocárdio").
- Corpo: explicação, definição ou anotações.
- Relações típicas: \`PERTENCE_A\` → TOPICO, \`IS_A\`, \`PART_OF\`, \`PREREQUISITO\`,
  \`DERIVA_DE\`, \`EVOLUI_PARA\`, \`REFORCA\`, \`CONTRASTA_COM\`, \`CONFUNDE_COM\`.

### NOTA
Nota Zettelkasten livre.
- Corpo: conteúdo completo da nota em Markdown.
- Relações típicas: \`PERTENCE_A\` → TOPICO ou ASSUNTO, \`DEFINE\` / \`EXPLICA\` → CONCEITO.

### FLASHCARD
Cartão de estudo.
- Corpo **obrigatório** no formato:
\`\`\`
## Pergunta

Texto da pergunta

## Resposta

Texto da resposta
\`\`\`
- Relações típicas: \`HERDA\` / \`DEFINE\` → CONCEITO, \`TESTA\` → NOTA.

### BARALHO
Deck de flashcards (pasta \`Projects/\`).
- Sem corpo relevante.
- Relação: \`CONTEM\` → FLASHCARD.

### TEXTO_BRUTO
Texto de referência importado.
- Corpo: texto completo.
- Relação: \`GERA\` → NOTA.

---

## Relações permitidas (resumo)

| De → Para | Relações válidas |
|---|---|
| CONCEITO → TOPICO | \`PERTENCE_A\`, \`FUNDAMENTA\`, \`APLICADO_EM\` |
| CONCEITO → CONCEITO | \`IS_A\`, \`PART_OF\`, \`PREREQUISITO\`, \`DERIVA_DE\`, \`EVOLUI_PARA\`, \`REFORCA\`, \`ALTERNATIVA_A\`, \`CONTRASTA_COM\`, \`CONFUNDE_COM\`, \`ANTI_PADRAO_DE\` |
| TOPICO → ASSUNTO | \`PERTENCE_A\`, \`APLICADO_EM\` |
| TOPICO → TOPICO | \`SUBTOPICO_DE\`, \`RELACIONADO\`, \`DEPENDE_DE\`, \`EVOLUI_PARA\` |
| NOTA → CONCEITO | \`DEFINE\`, \`EXPLICA\`, \`APROFUNDA\`, \`EXEMPLIFICA\`, \`CONTRASTA\`, \`SINTETIZA\`, \`ALERTA_ERRO\` |
| NOTA → TOPICO/ASSUNTO | \`PERTENCE_A\` |
| FLASHCARD → CONCEITO | \`HERDA\`, \`DEFINE\`, \`EXPLICA\`, \`APROFUNDA\`, \`EXEMPLIFICA\` |
| FLASHCARD → NOTA | \`TESTA\` |
| BARALHO → FLASHCARD | \`CONTEM\` |
| TEXTO_BRUTO → NOTA | \`GERA\` |

---

## Como criar um novo nó

1. Gere um UUID v4 (ex: \`crypto.randomUUID()\` no Node, ou use qualquer gerador online).
2. Crie um arquivo na pasta correta: \`Resources/nome-do-conceito--<uuid>.md\`.
3. Preencha o frontmatter com \`id\`, \`tipo\`, \`grafo\` (copie do frontmatter de outro arquivo do mesmo grafo) e \`titulo\`.
4. Adicione as relações necessárias.
5. Salve e faça Pull no NeuraLabs.

## Como editar um nó existente

- Edite **apenas** o corpo Markdown e/ou o campo \`relacoes\` no frontmatter.
- Para renomear: altere \`titulo\` no frontmatter E o nome do arquivo (o app usa o \`id\` para identificar, não o nome do arquivo).
- Nunca altere \`id\`, \`tipo\` ou \`grafo\`.

## Não faça

- Não crie arquivos fora das pastas PARA.
- Não remova arquivos — o Pull ignora arquivos ausentes (use o app para deletar nós).
- Não duplique \`id\`s.
`;

// ---------------------------------------------------------------------------
// IPC: vault (sistema de arquivos)
// ---------------------------------------------------------------------------
ipcMain.handle("vault:get-path", () => readConfig().vaultPath || null);

ipcMain.handle("vault:pick-folder", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Escolher pasta do vault",
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const dir = res.filePaths[0];
  writeConfig({ vaultPath: dir });
  initVault(dir);
  return dir;
});

// grava a lista de arquivos {relPath, content} dentro de dir (cria pastas).
ipcMain.handle("vault:write", async (_e, { dir, files }) => {
  if (!dir || !Array.isArray(files)) throw new Error("Argumentos inválidos");
  const root = path.resolve(dir);
  for (const folder of PARA_FOLDERS) fs.mkdirSync(path.join(root, folder), { recursive: true });
  let written = 0;
  for (const f of files) {
    if (!f || typeof f.relPath !== "string") continue;
    const target = path.resolve(root, f.relPath);
    // segurança: não escrever fora da pasta do vault
    if (!target.startsWith(root + path.sep) && target !== root) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(f.content ?? ""), "utf8");
    written++;
  }
  return { written };
});

// lê todos os .md sob as pastas PARA, retornando {relPath, content}.
ipcMain.handle("vault:read", async (_e, dir) => {
  if (!dir) throw new Error("Pasta não informada");
  const root = path.resolve(dir);
  const out = [];
  const walk = (abs) => {
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        out.push({ relPath: path.relative(root, full), content: fs.readFileSync(full, "utf8") });
      }
    }
  };
  for (const folder of PARA_FOLDERS) walk(path.join(root, folder));
  return out;
});

ipcMain.handle("vault:open-folder", async (_e, dir) => {
  if (dir) await shell.openPath(path.resolve(dir));
});

// ---------------------------------------------------------------------------
// Vault: estado de sincronização (.neuralabs-sync.json por subpasta de grafo)
// ---------------------------------------------------------------------------
const SYNC_STATE_FILE = ".neuralabs-sync.json";

ipcMain.handle("vault:read-sync-state", async (_e, dir) => {
  if (!dir) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(path.resolve(dir), SYNC_STATE_FILE), "utf8"));
  } catch {
    return null;
  }
});

ipcMain.handle("vault:write-sync-state", async (_e, { dir, state }) => {
  if (!dir) throw new Error("dir obrigatório");
  const root = path.resolve(dir);
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, SYNC_STATE_FILE);
  let current = {};
  try { current = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* sem estado anterior */ }
  fs.writeFileSync(file, JSON.stringify({ ...current, ...state }, null, 2), "utf8");
  return { ok: true };
});

// Retorna quantos .md nas pastas PARA foram modificados depois de `since` (ISO 8601).
ipcMain.handle("vault:check-modified", async (_e, { dir, since }) => {
  if (!dir) return { count: 0, files: [] };
  const root = path.resolve(dir);
  const sinceMs = since ? new Date(since).getTime() : 0;
  const modified = [];
  const walk = (abs) => {
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md") && fs.statSync(full).mtimeMs > sinceMs) {
        modified.push(path.relative(root, full));
      }
    }
  };
  for (const folder of PARA_FOLDERS) walk(path.join(root, folder));
  return { count: modified.length, files: modified };
});

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
app.whenReady().then(() => { Menu.setApplicationMenu(null); boot(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) boot(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
