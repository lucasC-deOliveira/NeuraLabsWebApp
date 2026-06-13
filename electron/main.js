// Processo principal do Electron.
// Sobe o servidor Next (build standalone) num processo Node próprio e abre uma
// janela apontando para http://127.0.0.1:<porta>. O banco SQLite e o segredo de
// sessão ficam na pasta de dados do usuário (userData), graváveis e por máquina.
const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const crypto = require("crypto");

const isDev = !app.isPackaged;
// Em dev, assume `next dev` rodando nesta porta (npm run electron:dev).
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:3000";

// Login social (OAuth) no desktop: segredo por execução que só o app conhece,
// e porta de loopback fixa para capturar o retorno do provedor.
const DESKTOP_AUTH_SECRET = crypto.randomBytes(24).toString("hex");
const OAUTH_LOOPBACK_PORT = 8765;
const SESSION_COOKIE = "neuralabs_session";

let serverProcess = null;
let mainWindow = null;
let serverPort = null; // porta do servidor Next (definida em startServer)
let serverOrigin = null; // http://127.0.0.1:<porta> (dev: DEV_URL)

// ---------------------------------------------------------------------------
// Caminhos e configuração persistente (userData)
// ---------------------------------------------------------------------------
function userDataFile(name) {
  return path.join(app.getPath("userData"), name);
}

// Segredo de sessão (JWT) gerado uma vez por instalação e reutilizado.
function getOrCreateJwtSecret() {
  const file = userDataFile("config.json");
  try {
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    if (cfg.jwtSecret) return cfg.jwtSecret;
  } catch {
    // arquivo ausente/corrompido — recria abaixo
  }
  const secret = crypto.randomBytes(48).toString("hex");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ jwtSecret: secret }, null, 2));
  return secret;
}

// Garante o banco em userData. No primeiro boot, copia o template vazio
// (schema já aplicado) empacotado em resources.
function ensureDatabase() {
  const dbPath = userDataFile("app.db");
  if (!fs.existsSync(dbPath)) {
    const template = isDev
      ? path.join(__dirname, "..", "build", "app.db")
      : path.join(process.resourcesPath, "app.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(template)) {
      fs.copyFileSync(template, dbPath);
    } else {
      // sem template: cria arquivo vazio (o Prisma aplicará o schema via push
      // só se houver migrações em runtime — aqui esperamos o template existir)
      fs.writeFileSync(dbPath, "");
    }
  }
  return dbPath;
}

// ---------------------------------------------------------------------------
// Porta livre + espera o servidor responder
// ---------------------------------------------------------------------------
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Servidor não respondeu a tempo"));
        else setTimeout(tick, 300);
      });
      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("Servidor não respondeu a tempo"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

// ---------------------------------------------------------------------------
// Servidor Next (standalone)
// ---------------------------------------------------------------------------
async function startServer() {
  const port = await findFreePort();
  serverPort = port;
  serverOrigin = `http://127.0.0.1:${port}`;
  const serverDir = path.join(process.resourcesPath, "standalone");
  const serverEntry = path.join(serverDir, "server.js");

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`server.js não encontrado em ${serverEntry}`);
  }

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: `file:${ensureDatabase()}`,
    JWT_SECRET: getOrCreateJwtSecret(),
    // habilita o modo de armazenamento em arquivos (vault Markdown) — só no desktop
    DESKTOP_APP: "1",
    // segredo que autoriza o endpoint de OAuth desktop a ser chamado pelo app
    DESKTOP_AUTH_SECRET,
  };

  serverProcess = fork(serverEntry, [], {
    cwd: serverDir,
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    execPath: process.execPath,
  });
  serverProcess.stdout?.on("data", (d) => console.log("[next]", d.toString().trim()));
  serverProcess.stderr?.on("data", (d) => console.error("[next]", d.toString().trim()));
  serverProcess.on("exit", (code) => {
    console.log("[next] saiu com código", code);
    serverProcess = null;
  });

  await waitForServer(port);
  return port;
}

// ---------------------------------------------------------------------------
// Janela
// ---------------------------------------------------------------------------
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(url);

  // links externos abrem no navegador padrão, não dentro do app
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(target);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
async function boot() {
  try {
    if (isDev) {
      serverOrigin = DEV_URL;
      createWindow(DEV_URL);
      return;
    }
    const port = await startServer();
    createWindow(`http://127.0.0.1:${port}`);
  } catch (err) {
    console.error("Falha ao iniciar:", err);
    dialog.showErrorBox("Erro ao iniciar", String(err?.message || err));
    app.quit();
  }
}

// ---------------------------------------------------------------------------
// Login social (OAuth) no desktop: navegador externo + loopback
// ---------------------------------------------------------------------------
async function callDesktopAuth(payload) {
  const res = await fetch(`${serverOrigin}/api/auth/desktop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-desktop-secret": DESKTOP_AUTH_SECRET },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// espera o provedor redirecionar para http://127.0.0.1:8765/callback
function waitForOAuthCallback(expectedState, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body style='font-family:sans-serif;text-align:center;padding:3rem'>"
        + "<h2>Login concluído</h2><p>Você já pode voltar para o NeuraLabs.</p></body></html>");
      cleanup();
      if (!code || state !== expectedState) reject(new Error("Retorno OAuth inválido"));
      else resolve(code);
    });
    const timer = setTimeout(() => { cleanup(); reject(new Error("Tempo esgotado no login")); }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      try { server.close(); } catch { /* ignora */ }
    }
    server.on("error", (err) => { cleanup(); reject(err); });
    server.listen(OAUTH_LOOPBACK_PORT, "127.0.0.1");
  });
}

async function runDesktopOAuth(provider) {
  if (!serverOrigin) throw new Error("Servidor não está pronto");
  // 1. inicia o fluxo no servidor (monta a URL com state/PKCE)
  const { authUrl, state } = await callDesktopAuth({ action: "start", provider });
  // 2. abre o navegador padrão e espera o retorno no loopback
  const callbackPromise = waitForOAuthCallback(state);
  await shell.openExternal(authUrl);
  const code = await callbackPromise;
  // 3. troca o code por sessão e injeta o cookie na janela do app
  const { sessionToken } = await callDesktopAuth({ action: "finish", provider, code, state });
  await mainWindow.webContents.session.cookies.set({
    url: serverOrigin,
    name: SESSION_COOKIE,
    value: sessionToken,
    path: "/",
    httpOnly: true,
  });
  await mainWindow.loadURL(`${serverOrigin}/`);
  return { ok: true };
}

ipcMain.handle("desktop-oauth:login", async (_e, provider) => {
  if (provider !== "google" && provider !== "github") return { ok: false, error: "Provedor inválido" };
  try {
    return await runDesktopOAuth(provider);
  } catch (err) {
    console.error("[oauth]", err);
    return { ok: false, error: err?.message || "Falha no login social" };
  }
});

app.whenReady().then(boot);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) boot();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {
      // ignora
    }
  }
});
