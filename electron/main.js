// Processo principal do Electron (modelo novo — backend separado).
// O app é um THIN CLIENT: carrega a UI estática (build do Vite) via file:// e a
// página fala com o backend NestJS via JWT. O backend é configurável (config.json)
// e o app hospeda o VAULT: operações de sistema de arquivos (ler/gravar .md) via
// IPC, para edição externa (Obsidian/Claude Code) e sync manual Pull/Push.
const { app, BrowserWindow, shell, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn, exec, execSync } = require("child_process");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "https://localhost:5173";

// Dev: aceita cert auto-assinado do basicSsl do Vite.
if (isDev) app.commandLine.appendSwitch("ignore-certificate-errors");
const DEFAULT_API_URL = process.env.NEURALABS_API_URL || "http://127.0.0.1:3001/api";

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
// Claude Code proxy (porta 11435): expõe OpenAI-compatible endpoint que
// encaminha chamadas para o `claude` CLI instalado localmente.
// ---------------------------------------------------------------------------
const CLAUDE_PROXY_PORT = 11435;
let claudeProxyServer = null;

function formatPromptFromMessages(messages) {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const turns = messages.filter((m) => m.role !== "system");
  let prompt = system ? system + "\n\n" : "";
  for (let i = 0; i < turns.length; i++) {
    const m = turns[i];
    if (turns.length > 1) {
      prompt += (m.role === "user" ? "Usuário" : "Assistente") + ":\n";
    }
    prompt += m.content;
    if (i < turns.length - 1) prompt += "\n\n";
  }
  return prompt.trim();
}

const FIREWALL_RULE = "NeuraLabs Claude Proxy";

// A regra sobrevive entre execuções. Consultar é barato e NÃO pede elevação —
// recriá-la a cada boot é que forçava um prompt de UAC toda vez.
function firewallRuleExists(port) {
  try {
    const out = execSync(`netsh advfirewall firewall show rule name="${FIREWALL_RULE}"`, {
      shell: true,
      stdio: "pipe",
    }).toString();
    return out.includes(String(port));
  } catch {
    return false;
  }
}

const addRuleCmd = (port) =>
  `netsh advfirewall firewall add rule name="${FIREWALL_RULE}" protocol=TCP dir=in localport=${port} action=allow profile=any`;

// Pede a regra com elevação, sem esperar: um -Wait aqui congelaria o app enquanto o
// prompt de UAC estivesse na tela.
function addRuleElevated(port) {
  const ps =
    `powershell -Command "Start-Process -FilePath netsh -ArgumentList 'advfirewall firewall ` +
    `add rule name=\\"${FIREWALL_RULE}\\" protocol=TCP dir=in localport=${port} action=allow profile=any' ` +
    `-Verb RunAs -WindowStyle Hidden"`;
  exec(ps, { shell: true }, (e) => {
    if (e) console.error("Não foi possível adicionar regra de firewall:", e.message);
  });
}

// NUNCA bloqueia o processo principal. O boot cria a janela e só DEPOIS carrega o
// conteúdo; um execSync aqui — ainda mais com prompt de UAC — deixava o app em tela
// preta até alguém responder ao prompt.
function allowFirewallPort(port) {
  if (firewallRuleExists(port)) return;
  exec(addRuleCmd(port), { shell: true }, (err) => {
    if (!err) {
      console.log("Regra de firewall adicionada.");
      return;
    }
    addRuleElevated(port);
  });
}

function startClaudeProxy() {
  if (claudeProxyServer) return;
  allowFirewallPort(CLAUDE_PROXY_PORT);
  claudeProxyServer = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405); res.end("Method Not Allowed"); return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const messages = parsed.messages || [];
        const wantsJson = parsed.response_format?.type === 'json_object';
        // Se a API pediu JSON, reforça a instrução no system prompt
        if (wantsJson) {
          const sys = messages.find((m) => m.role === 'system');
          if (sys) sys.content += '\n\nIMPORTANTE: Responda APENAS com JSON válido e nada mais. Sem blocos markdown, sem texto antes ou depois do JSON.';
          else messages.unshift({ role: 'system', content: 'Responda APENAS com JSON válido e nada mais. Sem blocos markdown, sem texto antes ou depois do JSON.' });
        }
        const prompt = formatPromptFromMessages(messages);
        const proc = spawn("claude", ["--print", "--output-format", "json"], {
          env: { ...process.env },
          shell: true, // necessário no Windows para encontrar o .cmd do npm
        });
        let stdout = "", stderr = "", responded = false;
        const send = (status, body) => {
          if (responded) return;
          responded = true;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(body));
        };
        // Timeout de 4 minutos — evita travar indefinidamente
        const killTimer = setTimeout(() => {
          proc.kill();
          send(504, { error: { message: "Claude Code não respondeu em 4 minutos. Tente novamente.", type: "timeout" } });
        }, 4 * 60 * 1000);
        proc.stdin.write(prompt);
        proc.stdin.end();
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.on("error", (err) => {
          clearTimeout(killTimer);
          const msg = err.code === "ENOENT"
            ? "Claude Code não encontrado. Instale com: npm install -g @anthropic-ai/claude-code"
            : err.message;
          send(500, { error: { message: msg, type: "server_error" } });
        });
        proc.on("close", (code) => {
          clearTimeout(killTimer);
          if (code !== 0) {
            send(500, { error: { message: stderr || `claude saiu com código ${code}`, type: "server_error" } });
            return;
          }
          let content = stdout.trim();
          try {
            const parsed = JSON.parse(stdout);
            if (parsed.result !== undefined) content = parsed.result;
          } catch { /* usa stdout bruto */ }
          const response = {
            id: `chatcmpl-cc-${Date.now()}`,
            object: "chat.completion",
            model: "claude-code",
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          };
          send(200, response);
        });
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: err.message, type: "invalid_request_error" } }));
        }
      }
    });
  });
  // 0.0.0.0 para que o Docker Desktop consiga alcançar via host.docker.internal
  claudeProxyServer.listen(CLAUDE_PROXY_PORT, "0.0.0.0", () => {
    console.log(`Claude Code proxy rodando na porta ${CLAUDE_PROXY_PORT}`);
  });
  claudeProxyServer.on("error", (err) => {
    console.error("Claude Code proxy erro:", err.message);
    claudeProxyServer = null;
  });
}

function stopClaudeProxy() {
  if (claudeProxyServer) {
    claudeProxyServer.close();
    claudeProxyServer = null;
  }
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
    if (readConfig().claudeCodeEnabled) startClaudeProxy();
    if (isDev) {
      // Se USE_LOCAL_DIST=1, carrega o build estático local (sem dev server).
      const localDist = path.join(__dirname, "../dist/index.html");
      if (process.env.USE_LOCAL_DIST === "1" && fs.existsSync(localDist)) {
        await mainWindow.loadFile(localDist);
        return;
      }
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
// Em dev+Vite, não injetamos a URL (o proxy do Vite roteia /api → backend).
// Com USE_LOCAL_DIST=1 ou em produção, injetamos a URL real do backend.
const useLocalDist = process.env.USE_LOCAL_DIST === "1";
ipcMain.on("neuralabs:get-api-url-sync", (e) => { e.returnValue = (isDev && !useLocalDist) ? "" : getApiUrl(); });
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
// IPC: Claude Code (proxy local)
// ---------------------------------------------------------------------------
ipcMain.handle("neuralabs:get-claude-code-config", () => {
  const cfg = readConfig();
  return {
    enabled: cfg.claudeCodeEnabled ?? false,
    savedApiConfig: cfg.savedApiConfig ?? null,
  };
});

ipcMain.handle("neuralabs:set-claude-code-enabled", (_e, { enabled, savedConfig }) => {
  if (enabled) {
    writeConfig({ claudeCodeEnabled: true, savedApiConfig: savedConfig ?? null });
    startClaudeProxy();
    return { ok: true };
  } else {
    const savedApiConfig = readConfig().savedApiConfig ?? null;
    writeConfig({ claudeCodeEnabled: false, savedApiConfig: null });
    stopClaudeProxy();
    return { ok: true, savedApiConfig };
  }
});

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

// lê um arquivo arbitrário dentro do vault (qualquer extensão).
ipcMain.handle("vault:read-file", async (_e, { dir, relPath }) => {
  if (!dir || !relPath) return null;
  try {
    const full = path.resolve(dir, relPath);
    if (!full.startsWith(path.resolve(dir) + path.sep) && full !== path.resolve(dir)) return null;
    return fs.readFileSync(full, "utf8");
  } catch { return null; }
});

// grava um arquivo arbitrário dentro do vault (qualquer extensão).
ipcMain.handle("vault:write-file", async (_e, { dir, relPath, content }) => {
  if (!dir || !relPath) throw new Error("Argumentos inválidos");
  const root = path.resolve(dir);
  const full = path.resolve(root, relPath);
  if (!full.startsWith(root + path.sep) && full !== root) throw new Error("Caminho inválido");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, String(content ?? ""), "utf8");
  return { ok: true };
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
  if (!dir) return;
  const abs = path.resolve(dir);
  fs.mkdirSync(abs, { recursive: true });
  for (const folder of PARA_FOLDERS) fs.mkdirSync(path.join(abs, folder), { recursive: true });
  await shell.openPath(abs);
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
// Vault: file watcher (grafo em tempo real, sem sincronizar com o backend)
// ---------------------------------------------------------------------------
const vaultWatchers = new Map(); // watchId → { watcher, timer }

function readGraphDir(root) {
  const files = [];
  const walk = (abs) => {
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        try { files.push({ relPath: path.relative(root, full), content: fs.readFileSync(full, "utf8") }); }
        catch { /* inacessível */ }
      }
    }
  };
  for (const folder of PARA_FOLDERS) walk(path.join(root, folder));
  return files;
}

ipcMain.handle("vault:watch", async (_e, { dir, watchId }) => {
  if (!dir) return { ok: false };
  const existing = vaultWatchers.get(watchId);
  if (existing) { try { existing.watcher.close(); } catch {} clearTimeout(existing.timer); }

  const root = path.resolve(dir);
  const entry = { watcher: null, timer: null };

  const flush = () => {
    const files = readGraphDir(root);
    mainWindow?.webContents.send("vault:changed", { watchId, files });
  };

  try {
    entry.watcher = fs.watch(root, { recursive: true }, (_, filename) => {
      if (!filename?.toLowerCase().endsWith(".md")) return;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(flush, 80);
    });
    vaultWatchers.set(watchId, entry);
  } catch { /* dir não existe ainda */ }
  return { ok: true };
});

ipcMain.handle("vault:unwatch", (_e, watchId) => {
  const entry = vaultWatchers.get(watchId);
  if (entry) { try { entry.watcher.close(); } catch {} clearTimeout(entry.timer); vaultWatchers.delete(watchId); }
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
app.whenReady().then(() => { Menu.setApplicationMenu(null); boot(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) boot(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
