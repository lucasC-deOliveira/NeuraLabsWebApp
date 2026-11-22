// Processo principal do Electron (modelo novo — backend separado).
// O app é um THIN CLIENT: carrega a UI estática (build do Vite) via file:// e a
// página fala com o backend NestJS via JWT. O backend é configurável (config.json)
// e o app hospeda o VAULT: operações de sistema de arquivos (ler/gravar .md) via
// IPC, para edição externa (Obsidian/Claude Code) e sync manual Pull/Push.
const { app, BrowserWindow, shell, dialog, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { randomBytes } = require("node:crypto");
const { CODEX_PROXY_PORT, makeCodexProxy } = require("./codex-proxy");
const { spawn, exec, execSync } = require("child_process");
const { readVaultStudy, writeVaultStudy, replaceVaultFile } = require("./vault-study-store");
const { installVaultAgentSkills } = require("./vault-agent-skills");
const { listLibraryPdfs, readLibraryPdf, importLibraryPdf } = require("./vault-library-pdfs");
const { loadReaderOcr, saveReaderOcr } = require("./reader-ocr");
const { saveReaderMarkdown } = require("./reader-markdown");
const { listReaderTranscriptions, readReaderTranscription, readReaderTranscriptionImage, trashReaderTranscription } = require("./reader-transcriptions");
const { searchReaderTranscription, findReaderBookEvidence } = require("./reader-semantic");
const { listVaultGraphFolders } = require("./vault-graph-folders");
const { writeBookGraph, readBookGraphPage } = require("./vault-book-graph");
const { readSharedGraphSnapshot, readLegacyGraphSnapshot } = require("./vault-graph-read");
const { graphWatchFilter } = require("./vault-graph-watch-filter");
const { saveReaderExplanation, listReaderExplanations } = require("./reader-explanations");
const { vaultGraphLocation, vaultStudyFile, examRecordDirectory } = require("./vault-paths");
const {
  readSharedManifest, sharedGraph, writeSharedGraphFiles,
  planSharedReplacement, unlinkSharedNotes, commitVaultWrites,
} = require("./vault-shared-para");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "https://localhost:5173";

// Dev: aceita cert auto-assinado do basicSsl do Vite.
if (isDev) app.commandLine.appendSwitch("ignore-certificate-errors");
const DEFAULT_API_URL = process.env.NEURALABS_API_URL || "http://127.0.0.1:3001/api";

// Pastas PARA do vault (espelha src/lib/vault-format.ts).
const PARA_FOLDERS = ["Projects", "Areas", "Resources", "Archives"];

let mainWindow = null;
let codexProxy = null;
let codexStarting = false;

async function startCodexProxy(token) {
  if (codexProxy?.listening) return;
  const server = makeCodexProxy(token);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(CODEX_PROXY_PORT, "0.0.0.0", () => {
      server.off("error", reject);
      server.on("error", (error) => console.error("Codex proxy error:", error.code));
      resolve();
    });
  });
  codexProxy = server;
}

function stopCodexProxy() {
  if (!codexProxy) return;
  codexProxy.close();
  codexProxy.closeAllConnections();
  codexProxy = null;
}

function codexProxyConfig(token) {
  return { apiKey: token, baseUrl: `http://host.docker.internal:${CODEX_PROXY_PORT}/v1`, modelo: "codex" };
}

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
    initializeConfiguredVault();
    if (readConfig().claudeCodeEnabled) startClaudeProxy();
    const codex = readConfig().codexProxy;
    if (codex?.token) void startCodexProxy(codex.token).catch((error) => console.error("Codex proxy startup error:", error.code));
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
  const resources = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
  installVaultAgentSkills(root, {
    guide: path.join(__dirname, "vault-guide.md"),
    skills: path.join(resources, "skills"),
    tools: app.isPackaged ? path.join(resources, "vault-tools") : path.join(resources, "dist-electron", "vault-tools"),
  });
  const claudeMd = path.join(root, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(claudeMd, VAULT_CLAUDE_MD, "utf8");
  }
}

function initializeConfiguredVault() {
  const vault = readConfig().vaultPath;
  if (!vault || !fs.existsSync(vault)) return;
  try {
    initVault(vault);
  } catch (error) {
    console.error(JSON.stringify({ event: "vault_agent_initialization_failed", message: error.message }));
  }
}

const VAULT_CLAUDE_MD = `# NeuraLabs Vault — instruções para o Claude

Se houver um \`AGENTS.md\` na raiz, comece por ele. Ele descreve o PARA compartilhado
e como consultar os índices sem abrir o NeuraLabs. O formato por pasta abaixo é legado.

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
    if (readConfig().codexProxy) throw new Error("Desative o Codex antes de ativar o Claude Code.");
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

ipcMain.handle("neuralabs:get-codex-proxy", () => {
  const state = readConfig().codexProxy;
  return state ? { enabled: true, previous: state.previous, proxy: codexProxyConfig(state.token) } : { enabled: false };
});

ipcMain.handle("neuralabs:start-codex-proxy", async (_event, previous) => {
  const config = readConfig();
  if (config.claudeCodeEnabled) throw new Error("Desative o Claude Code antes de ativar o Codex.");
  if (codexStarting) throw new Error("O proxy do Codex está iniciando.");
  if (previous !== null && !["apiKey", "baseUrl", "modelo"].every((key) => typeof previous?.[key] === "string")) {
    throw new Error("Configuração anterior de IA inválida.");
  }
  const state = config.codexProxy ?? { token: randomBytes(32).toString("hex"), previous };
  codexStarting = true;
  try {
    await startCodexProxy(state.token);
    writeConfig({ codexProxy: state });
    return codexProxyConfig(state.token);
  } catch (error) {
    stopCodexProxy();
    throw error;
  } finally {
    codexStarting = false;
  }
});

ipcMain.handle("neuralabs:stop-codex-proxy", () => {
  writeConfig({ codexProxy: null });
  stopCodexProxy();
});

// ---------------------------------------------------------------------------
// IPC: vault (sistema de arquivos)
// ---------------------------------------------------------------------------
ipcMain.handle("vault:get-path", () => readConfig().vaultPath || null);
ipcMain.handle("vault:list-library-pdfs", () => listLibraryPdfs(readConfig().vaultPath));
ipcMain.handle("vault:import-library-pdf", async () => {
  const vault = readConfig().vaultPath;
  if (!vault) throw new Error("No vault selected. Expected a configured vault.");
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Adicionar livro à biblioteca",
    properties: ["openFile"],
    filters: [{ name: "Documentos PDF", extensions: ["pdf"] }],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  if (vault !== readConfig().vaultPath) throw new Error("The vault changed while selecting a book.");
  return importLibraryPdf(vault, selection.filePaths[0]);
});
ipcMain.handle("vault:read-library-pdf", (_event, relative) => readLibraryPdf(readConfig().vaultPath, relative));
ipcMain.handle("vault:load-reader-ocr", (_event, relative) => loadReaderOcr(readConfig().vaultPath, relative));
ipcMain.handle("vault:recognize-reader-page", (_event, request) => saveReaderOcr(readConfig().vaultPath, request));
ipcMain.handle("vault:convert-reader-markdown", (event, request) =>
  saveReaderMarkdown(readConfig().vaultPath, request, (progress) => {
    if (!event.sender.isDestroyed()) event.sender.send("vault:reader-conversion-progress", progress);
  }),
);
ipcMain.handle("vault:list-reader-transcriptions", (_event, book) => listReaderTranscriptions(readConfig().vaultPath, book));
ipcMain.handle("vault:read-reader-transcription", (_event, book, id) => readReaderTranscription(readConfig().vaultPath, book, id));
ipcMain.handle("vault:search-reader-transcription", (_event, book, id, query) => searchReaderTranscription(readConfig().vaultPath, book, id, query));
ipcMain.handle("vault:find-reader-book-evidence", (_event, book, id, query) => findReaderBookEvidence(readConfig().vaultPath, book, id, query));
ipcMain.handle("vault:read-reader-transcription-image", (_event, book, id, name) => readReaderTranscriptionImage(readConfig().vaultPath, book, id, name));
ipcMain.handle("vault:trash-reader-transcription", (_event, book, id) => trashReaderTranscription(readConfig().vaultPath, book, id, (target) => shell.trashItem(target)));
ipcMain.handle("vault:list-graph-folders", () => listVaultGraphFolders(readConfig().vaultPath));
ipcMain.handle("vault:write-book-graph", (_event, update) => writeBookGraph(readConfig().vaultPath, update));
ipcMain.handle("vault:read-book-graph-page", (_event, graphId, page) => readBookGraphPage(readConfig().vaultPath, graphId, page));
ipcMain.handle("vault:list-reader-explanations", (_event, book, page) => listReaderExplanations(readConfig().vaultPath, book, page));
ipcMain.handle("vault:save-reader-explanation", (_event, book, page, explanation) => saveReaderExplanation(readConfig().vaultPath, book, page, explanation));
ipcMain.handle("vault:list-exam-attempts", (_event, dir) => {
  const location = vaultGraphLocation(readConfig().vaultPath, dir);
  if (!location) {
    throw new Error("Invalid exam directory. Expected a graph in the configured vault.");
  }
  const folder = examRecordDirectory(location, ".neuralabs-exam-attempts");
  try {
    if (!fs.lstatSync(folder).isDirectory()) return [];
    return fs.readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^[a-zA-Z0-9_-]+\.json$/.test(entry.name))
      .map((entry) => `.neuralabs-exam-attempts/${entry.name}`);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
});

function graphMarkdownTarget(folders, { dir, relPath, expected, next }) {
  if (![dir, relPath, expected, next].every((value) => typeof value === "string")) return null;
  if (!folders.has(dir)) return null;
  const target = path.resolve(dir, relPath);
  const relative = path.relative(dir, target);
  if (!PARA_FOLDERS.includes(relative.split(path.sep)[0]) || path.extname(target) !== ".md") return null;
  try {
    const resolved = path.join(fs.realpathSync(dir), relative);
    if (!fs.lstatSync(target).isFile() || fs.realpathSync(target) !== resolved) return null;
    return fs.readFileSync(target, "utf8") === expected ? target : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function replaceGraphMarkdownFiles(writes) {
  if (!Array.isArray(writes) || !writes.length || writes.some((write) => !write || typeof write !== "object")) return false;
  const folders = new Set(listVaultGraphFolders(readConfig().vaultPath).map((folder) => folder.directory));
  const planned = [];
  for (const dir of new Set(writes.map((write) => write.dir))) {
    if (!folders.has(dir)) return false;
    const updates = writes.filter((write) => write.dir === dir);
    if (new Set(updates.map((write) => write.relPath)).size !== updates.length) return false;
    const shared = activeSharedGraph(dir);
    const files = shared ? planSharedReplacement(shared, updates) : updates.map((write) => {
      const target = graphMarkdownTarget(folders, write);
      return target ? { target, expected: write.expected, next: write.next } : null;
    });
    if (!files || files.includes(null)) return false;
    planned.push(...files);
  }
  return commitVaultWrites(planned);
}

ipcMain.handle("vault:replace-graph-markdown", (_event, write) => replaceGraphMarkdownFiles([write]));
ipcMain.handle("vault:replace-graph-markdown-batch", (_event, writes) => replaceGraphMarkdownFiles(writes));
ipcMain.handle("vault:study-read", (_event, folder) => readVaultStudy(readConfig().vaultPath, folder));
ipcMain.handle("vault:study-write", (_event, update) => writeVaultStudy(readConfig().vaultPath, update));

ipcMain.handle("vault:pick-folder", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Escolher pasta do vault",
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const dir = res.filePaths[0];
  initVault(dir);
  writeConfig({ vaultPath: dir });
  return dir;
});

function activeSharedGraph(dir, files) {
  const root = readConfig().vaultPath;
  const location = vaultGraphLocation(root, dir);
  if (!location) return null;
  const manifestFile = files?.find((file) => file?.relPath === ".neuralabs-graph.json");
  const current = readSharedManifest(dir);
  const proposed = manifestFile ? JSON.parse(manifestFile.content) : null;
  if (!current && (!proposed || proposed.layout !== "shared-para" ||
    listVaultGraphFolders(root).some((folder) => folder.id === location.id))) return null;
  const manifest = current && proposed
    ? { ...proposed, id: current.id, layout: current.layout, bookSource: current.bookSource ?? proposed.bookSource,
      bookIndex: current.bookIndex ?? proposed.bookIndex }
    : current ?? proposed;
  if (manifestFile && current && manifestFile.content !== JSON.stringify(manifest, null, 2) + "\n") {
    manifestFile.content = JSON.stringify(manifest, null, 2) + "\n";
  }
  return sharedGraph(root, dir, manifest);
}

// grava a lista de arquivos {relPath, content} dentro de dir (cria pastas).
ipcMain.handle("vault:write", async (_e, { dir, files }) => {
  if (!dir || !Array.isArray(files)) throw new Error("Argumentos inválidos");
  const shared = activeSharedGraph(dir, files);
  if (shared) return writeSharedGraphFiles(shared, files);
  if (vaultGraphLocation(readConfig().vaultPath, dir)?.central) {
    throw new Error("O diretório de metadados precisa de um manifesto de grafo compartilhado válido.");
  }
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

function resolveVaultRecord(dir, relPath) {
  const configured = readConfig().vaultPath;
  const root = path.resolve(dir);
  if (configured && root === path.resolve(configured) && relPath === "_srs.json") {
    return vaultStudyFile(root, relPath);
  }
  const exam = /^(\.neuralabs-exam-(?:progress|attempts))[/\\]([a-zA-Z0-9_-]+\.json)$/.exec(relPath);
  const location = exam ? vaultGraphLocation(configured, dir) : null;
  if (location) return path.join(examRecordDirectory(location, exam[1]), exam[2]);
  const full = path.resolve(root, relPath);
  return full.startsWith(root + path.sep) ? full : null;
}

// lê um arquivo arbitrário dentro do vault (qualquer extensão).
ipcMain.handle("vault:read-file", async (_e, { dir, relPath }) => {
  if (!dir || !relPath) return null;
  try {
    const full = resolveVaultRecord(dir, relPath);
    if (!full || !fs.lstatSync(full).isFile()) return null;
    return fs.readFileSync(full, "utf8");
  } catch { return null; }
});

// grava um arquivo arbitrário dentro do vault (qualquer extensão).
ipcMain.handle("vault:write-file", async (_e, { dir, relPath, content }) => {
  if (!dir || !relPath) throw new Error("Argumentos inválidos");
  const full = resolveVaultRecord(dir, relPath);
  if (!full || (fs.existsSync(full) && !fs.lstatSync(full).isFile())) throw new Error("Caminho inválido");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const folder = path.basename(path.dirname(full));
  const examRecord = path.extname(full) === ".json" &&
    [".neuralabs-exam-progress", ".neuralabs-exam-attempts"].includes(folder);
  if (path.basename(full) === "_srs.json" || examRecord) replaceVaultFile(full, String(content ?? ""));
  else fs.writeFileSync(full, String(content ?? ""), "utf8");
  return { ok: true };
});

// apaga .md dentro do vault. Usado só pela limpeza de órfãos, e por isso é
// deliberadamente estreito: recusa qualquer caminho que escape da pasta e
// qualquer arquivo que não termine em .md, para que um relPath vindo do
// renderer nunca alcance outra coisa do disco. Devolve o que apagou e o que
// recusou — a UI mostra os dois.
ipcMain.handle("vault:delete-files", async (_e, { dir, relPaths }) => {
  if (!dir || !Array.isArray(relPaths)) throw new Error("Argumentos inválidos");
  const shared = activeSharedGraph(dir);
  if (shared) return unlinkSharedNotes(shared, relPaths);
  const root = path.resolve(dir);
  const deleted = [];
  const skipped = [];
  for (const relPath of relPaths) {
    if (typeof relPath !== "string" || !relPath.toLowerCase().endsWith(".md")) {
      skipped.push(String(relPath));
      continue;
    }
    const full = path.resolve(root, relPath);
    if (!full.startsWith(root + path.sep)) {
      skipped.push(relPath);
      continue;
    }
    try {
      fs.unlinkSync(full);
      deleted.push(relPath);
    } catch {
      skipped.push(relPath);
    }
  }
  return { deleted, skipped };
});

// lê todos os .md sob as pastas PARA, retornando {relPath, content}.
ipcMain.handle("vault:read", async (_e, dir) => {
  if (!dir) throw new Error("Pasta não informada");
  const shared = activeSharedGraph(dir);
  return shared ? readSharedGraphSnapshot(shared) : readLegacyGraphSnapshot(path.resolve(dir));
});

ipcMain.handle("vault:open-folder", async (_e, dir) => {
  if (!dir) return;
  const shared = activeSharedGraph(dir);
  if (shared) { await shell.openPath(shared.root); return; }
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
  const shared = activeSharedGraph(dir);
  if (shared) {
    const files = (await readSharedGraphSnapshot(shared, { since: sinceMs })).map(({ relPath }) => relPath);
    return { count: files.length, files };
  }
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

ipcMain.handle("vault:watch", async (event, { dir, watchId }) => {
  if (!dir) return { ok: false };
  const existing = vaultWatchers.get(watchId);
  if (existing) { try { existing.watcher.close(); } catch {} clearTimeout(existing.timer); }

  const root = path.resolve(dir);
  const shared = activeSharedGraph(dir);
  const watchedRoot = shared?.root ?? root;
  const entry = { watcher: null, timer: null, reading: false, pending: false, accepts: graphWatchFilter(shared, watchedRoot) };
  const schedule = () => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(flush, 120);
  };

  const flush = async () => {
    if (vaultWatchers.get(watchId) !== entry) return;
    if (entry.reading) { entry.pending = true; return; }
    entry.reading = true;
    try {
      const current = shared ? activeSharedGraph(dir) : null;
      entry.accepts = graphWatchFilter(current, watchedRoot);
      const files = current ? await readSharedGraphSnapshot(current) : await readLegacyGraphSnapshot(root, true);
      if (vaultWatchers.get(watchId) === entry && !event.sender.isDestroyed()) {
        event.sender.send("vault:changed", { watchId, files });
      }
    } catch (error) { console.error("Could not read changed vault files:", error.message); }
    finally {
      entry.reading = false;
      if (entry.pending && vaultWatchers.get(watchId) === entry) {
        entry.pending = false;
        schedule();
      }
    }
  };

  try {
    entry.watcher = fs.watch(watchedRoot, { recursive: true }, (_, filename) => {
      if (entry.accepts(filename)) schedule();
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
app.on("before-quit", stopCodexProxy);
