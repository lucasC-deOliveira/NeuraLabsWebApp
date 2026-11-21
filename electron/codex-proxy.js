const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { randomUUID, timingSafeEqual } = require("node:crypto");

const CODEX_PROXY_PORT = 11436;
const MAX_BODY = 1024 * 1024;
const TIMEOUT = 4 * 60_000;
const CODEX_ARGS = [
  "exec", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check",
  "--sandbox", "read-only", "--disable", "shell_tool", "--disable", "unified_exec",
  "--disable", "apps", "--disable", "browser_use", "--disable", "browser_use_external",
  "--disable", "in_app_browser", "--disable", "multi_agent_v2",
  "-c", "approval_policy=never", "-c", "web_search=disabled", "--color", "never", "-",
];

class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function formatCodexPrompt(messages, structured) {
  if (!Array.isArray(messages) || !messages.length || messages.some((message) =>
    !message || !["system", "developer", "user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
    throw new ProxyError(400, "Envie mensagens de texto com os papéis system, developer, user ou assistant.");
  }
  const instructions = structured
    ? "Retorne exclusivamente um objeto JSON válido, sem cercas Markdown."
    : "Retorne somente a resposta final ao usuário.";
  return `Responda seguindo as instruções das mensagens abaixo. ${instructions}\n\n${JSON.stringify(messages)}`;
}

function parseCodexOutput(output, structured) {
  const content = output.trim();
  if (!content) throw new ProxyError(502, "O Codex não retornou uma resposta.");
  if (!structured) return content;
  try {
    const result = JSON.parse(content.replace(/^\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60$/i, "$1"));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Expected JSON object.");
    return JSON.stringify(result);
  } catch {
    throw new ProxyError(502, "O Codex não retornou o objeto JSON solicitado.");
  }
}

function codexEnvironment() {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  delete env.OPENAI_BASE_URL;
  return env;
}

function stopCodexChild(child) {
  if (child.exitCode !== null || child.killed) return;
  if (process.platform !== "win32" || !child.pid) { child.kill(); return; }
  const stop = spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
  stop.once("error", () => child.kill());
}

function runCodex(prompt, signal) {
  if (signal.aborted) return Promise.reject(new ProxyError(499, "A requisição foi encerrada."));
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "neuralabs-codex-"));
  let child;
  try {
    child = spawn("codex", CODEX_ARGS, {
      cwd: workdir, env: codexEnvironment(), shell: process.platform === "win32", windowsHide: true,
    });
  } catch {
    fs.rmdirSync(workdir);
    return Promise.reject(new ProxyError(503, "Não foi possível iniciar o Codex CLI."));
  }
  return new Promise((resolve, reject) => {
    let stdout = "";
    const abort = () => {
      stopCodexChild(child);
      reject(new ProxyError(499, "A requisição foi encerrada."));
    };
    const timer = setTimeout(() => {
      stopCodexChild(child);
      reject(new ProxyError(504, "O Codex não respondeu a tempo."));
    }, TIMEOUT);
    signal.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length <= MAX_BODY) return;
      stopCodexChild(child);
      reject(new ProxyError(502, "A resposta do Codex excedeu o tamanho permitido."));
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", () => reject(new ProxyError(503, "Codex CLI indisponível. Confira a instalação.")));
    child.once("close", (code) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      try { fs.rmdirSync(workdir); } catch { /* Temporary directory may already be gone. */ }
      if (code !== 0) reject(new ProxyError(503, "Não foi possível concluir a chamada. Confira o login do Codex CLI."));
      else resolve(stdout);
    });
    child.stdin.end(prompt, "utf8");
  });
}

function authenticated(header, token) {
  if (typeof header !== "string") return false;
  const supplied = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function sendJson(response, status, payload) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readRequest(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > MAX_BODY) throw new ProxyError(413, "A solicitação ao Codex é muito grande.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ProxyError(400, "A solicitação precisa ser um JSON válido."); }
}

function makeCodexProxy(token, complete = runCodex) {
  let active = 0;
  return http.createServer(async (request, response) => {
    const sendError = (status, message) => sendJson(response, status, { error: { message, type: "codex_proxy_error" } });
    if (request.url !== "/v1/chat/completions" || request.method !== "POST") return sendError(404, "Rota não encontrada.");
    if (!authenticated(request.headers.authorization, token)) return sendError(401, "Credencial do proxy inválida.");
    if (active >= 2) return sendError(429, "O Codex está processando outras solicitações. Tente novamente.");
    const controller = new AbortController();
    response.once("close", () => controller.abort());
    active++;
    try {
      const input = await readRequest(request);
      if (!input || typeof input !== "object" || input.stream) throw new ProxyError(400, "Use uma solicitação sem streaming.");
      const structured = input.response_format?.type === "json_object";
      const prompt = formatCodexPrompt(input.messages, structured);
      const content = parseCodexOutput(await complete(prompt, controller.signal), structured);
      sendJson(response, 200, {
        id: `chatcmpl-codex-${randomUUID()}`, object: "chat.completion", model: "codex",
        created: Math.floor(Date.now() / 1000),
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      });
    } catch (error) {
      sendError(error instanceof ProxyError ? error.status : 502,
        error instanceof ProxyError ? error.message : "Não foi possível consultar o Codex.");
    } finally {
      active--;
    }
  });
}

module.exports = { CODEX_PROXY_PORT, makeCodexProxy };
