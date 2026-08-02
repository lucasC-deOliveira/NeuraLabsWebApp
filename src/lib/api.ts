// Cliente HTTP do frontend para a API NestJS (backend separado).
// Auth por Bearer JWT — o token fica no localStorage. Usado por client components.

// URL do backend. No desktop (Electron) é injetada em runtime via preload
// (window.__NEURALABS_API_URL__), pois o build embutido não pode usar
// VITE_* (fixado em build-time). Na web, usa o env/padrão.
export function resolveApiUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __NEURALABS_API_URL__?: string }).__NEURALABS_API_URL__;
    if (injected) return injected;
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return "/api"; // relativo: usa o mesmo host — no dev o Vite proxy redireciona para localhost:3001
}
const TOKEN_KEY = "neuralabs_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

/** Um erro de validação do backend, já associado ao campo que o causou. */
export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Vazio quando o erro não é por campo (401, 500, timeout...). */
    public fieldErrors: FieldError[] = [],
  ) {
    super(message);
  }
}

function isFieldError(value: unknown): value is FieldError {
  const candidate = value as FieldError | null;
  return typeof candidate?.path === "string" && typeof candidate?.message === "string";
}

/** Lê o `errors` do 400 de validação; qualquer outra forma vira lista vazia. */
export function readFieldErrors(data: unknown): FieldError[] {
  const errors = (data as { errors?: unknown } | null)?.errors;
  return Array.isArray(errors) ? errors.filter(isFieldError) : [];
}

// Teto de espera de qualquer requisição — nada trava a UI para sempre. Chamadas
// longas (geração por IA) podem passar um timeoutMs maior via options.
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Confere a resposta contra o contrato da rota.
 *
 * Tolerante de propósito: os schemas usam .passthrough(), então campo novo no
 * backend não quebra o cliente. Quando a forma foge do contrato, a decisão muda
 * com o ambiente — em dev/teste falha alto, para o contrato quebrado aparecer no
 * ato; em produção loga e devolve o dado cru, porque derrubar a tela do usuário
 * é pior do que renderizar algo incompleto.
 */
function parseResponse<T>(path: string, data: unknown, schema: ResponseSchema<T>): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const detail = `${path}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;
  if (import.meta.env.DEV) throw new ApiError(0, `Resposta fora do contrato — ${detail}`);
  console.error(`[api] resposta fora do contrato em ${detail}`);
  return data as T;
}

/** O mínimo de zod que a fachada precisa — evita casar a assinatura com a versão da lib. */
export interface ResponseSchema<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } };
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { timeoutMs?: number; schema?: ResponseSchema<T> } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, schema, ...init } = options;
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveApiUrl()}${path}`, { ...init, headers, signal: controller.signal });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      if (res.status === 401) clearToken();
      const message = (data && (data.message || data.error)) || `Erro ${res.status}`;
      throw new ApiError(
        res.status,
        Array.isArray(message) ? message.join(", ") : String(message),
        readFieldErrors(data),
      );
    }
    return schema ? parseResponse(path, data, schema) : (data as T);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "A requisição demorou demais para responder. Verifique sua conexão e tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Auth ----
export interface AuthUser {
  id: string;
  nome: string;
  email: string;
}
interface AuthResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  async register(input: { nome: string; email: string; senha: string }): Promise<AuthUser> {
    const r = await apiFetch<AuthResult>("/auth/register", { method: "POST", body: JSON.stringify(input) });
    setToken(r.token);
    return r.user;
  },
  async login(input: { email: string; senha: string }): Promise<AuthUser> {
    const r = await apiFetch<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    setToken(r.token);
    return r.user;
  },
  async logout(): Promise<void> {
    clearToken();
  },
  async me(): Promise<AuthUser | null> {
    if (!getToken()) return null;
    try {
      return await apiFetch<AuthUser>("/auth/me");
    } catch {
      return null;
    }
  },
};
