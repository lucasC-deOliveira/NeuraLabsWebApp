import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import {
  apiFetch,
  ApiError,
  getToken,
  setToken,
  clearToken,
  resolveApiUrl,
  readFieldErrors,
  authApi,
} from "./api";

// api.ts toca globais de DOM (window.localStorage, fetch). Como roda no projeto
// "node" (*.spec.ts), stubbamos esses globais em vez de jsdom.
function fakeLocalStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string): string | null => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string): void => void m.set(k, v),
    removeItem: (k: string): void => void m.delete(k),
  };
}

const httpResponse = (ok: boolean, status: number, body: unknown) => ({
  ok,
  status,
  text: () => Promise.resolve(body == null ? "" : JSON.stringify(body)),
});

let ls: ReturnType<typeof fakeLocalStorage>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ls = fakeLocalStorage();
  vi.stubGlobal("window", { localStorage: ls });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token storage", () => {
  it("stores, reads and clears the JWT in localStorage", () => {
    expect(getToken()).toBeNull();
    setToken("abc");
    expect(getToken()).toBe("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("resolveApiUrl", () => {
  it("prefers the desktop-injected url when present", () => {
    vi.stubGlobal("window", { __NEURALABS_API_URL__: "http://desktop", localStorage: ls });
    expect(resolveApiUrl()).toBe("http://desktop");
  });

  it("falls back to the relative /api", () => {
    expect(resolveApiUrl()).toBe("/api");
  });
});

describe("ApiError", () => {
  it("carries the status and message", () => {
    const err = new ApiError(404, "missing");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("missing");
    expect(err.fieldErrors).toEqual([]);
  });
});

describe("readFieldErrors", () => {
  it("reads the validation 400 shape", () => {
    const body = { errors: [{ path: "email", message: "Informe um email válido" }] };
    expect(readFieldErrors(body)).toEqual([{ path: "email", message: "Informe um email válido" }]);
  });

  it("ignores a body without errors, or with errors in another shape", () => {
    expect(readFieldErrors({ message: "nope" })).toEqual([]);
    expect(readFieldErrors({ errors: "boom" })).toEqual([]);
    expect(readFieldErrors(null)).toEqual([]);
  });

  it("drops entries that are not path/message pairs", () => {
    const body = { errors: [{ path: "email", message: "ok" }, { path: 1 }, "junk"] };
    expect(readFieldErrors(body)).toEqual([{ path: "email", message: "ok" }]);
  });
});

describe("apiFetch", () => {
  it("sends bearer + json headers and returns the parsed body", async () => {
    setToken("tok");
    fetchMock.mockResolvedValue(httpResponse(true, 200, { ok: 1 }));

    const out = await apiFetch("/x", { method: "POST", body: "{}" });

    expect(out).toEqual({ ok: 1 });
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/x");
    const headers = opts.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns null when the response body is empty", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 204, null));
    expect(await apiFetch("/x")).toBeNull();
  });

  it("throws ApiError with the server message and clears the token on 401", async () => {
    setToken("tok");
    fetchMock.mockResolvedValue(httpResponse(false, 401, { message: "nope" }));

    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 401, message: "nope" });
    expect(getToken()).toBeNull();
  });

  it("joins array validation messages", async () => {
    fetchMock.mockResolvedValue(httpResponse(false, 400, { message: ["a", "b"] }));
    await expect(apiFetch("/x")).rejects.toThrow("a, b");
  });

  it("keeps the per-field errors of a validation 400 alongside the joined message", async () => {
    const body = {
      message: ["Informe um email válido"],
      errors: [{ path: "email", message: "Informe um email válido" }],
    };
    fetchMock.mockResolvedValue(httpResponse(false, 400, body));

    await expect(apiFetch("/x")).rejects.toMatchObject({
      status: 400,
      message: "Informe um email válido",
      fieldErrors: [{ path: "email", message: "Informe um email válido" }],
    });
  });
});

describe("apiFetch com schema de resposta", () => {
  const schema = z.object({ id: z.string(), total: z.number() }).passthrough();

  it("devolve a resposta que casa com o contrato", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { id: "b1", total: 3 }));
    expect(await apiFetch("/x", { schema })).toEqual({ id: "b1", total: 3 });
  });

  it("deixa passar campo novo do backend, sem descartá-lo", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { id: "b1", total: 3, novoCampo: "ok" }));
    expect(await apiFetch("/x", { schema })).toEqual({ id: "b1", total: 3, novoCampo: "ok" });
  });

  // O ponto do PR: antes isso virava `undefined` no meio de um componente.
  it("falha alto quando a resposta foge do contrato", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { id: "b1", total: "três" }));
    await expect(apiFetch("/x", { schema })).rejects.toThrow(/fora do contrato/);
  });

  it("aponta o campo culpado na mensagem", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { id: "b1" }));
    await expect(apiFetch("/x", { schema })).rejects.toThrow(/total/);
  });

  it("sem schema, segue devolvendo o corpo sem conferir", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { qualquer: "coisa" }));
    expect(await apiFetch("/x")).toEqual({ qualquer: "coisa" });
  });

  // Em produção derrubar a tela é pior que renderizar algo incompleto: loga e segue.
  it("em produção, loga o desvio e devolve o dado cru em vez de quebrar", async () => {
    vi.stubEnv("DEV", false);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(httpResponse(true, 200, { id: "b1", total: "três" }));

    expect(await apiFetch("/x", { schema })).toEqual({ id: "b1", total: "três" });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("fora do contrato"));

    logged.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("authApi", () => {
  it("register persists the returned token and yields the user", async () => {
    fetchMock.mockResolvedValue(httpResponse(true, 200, { token: "t", user: { id: "u" } }));

    const user = await authApi.register({ nome: "A", email: "e@x.com", senha: "secret" });

    expect(user).toEqual({ id: "u" });
    expect(getToken()).toBe("t");
  });

  it("me returns null when there is no token (no request made)", async () => {
    expect(await authApi.me()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
