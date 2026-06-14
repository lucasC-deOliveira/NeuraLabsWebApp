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
// Ciclo de vida
// ---------------------------------------------------------------------------
app.whenReady().then(() => { Menu.setApplicationMenu(null); boot(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) boot(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
