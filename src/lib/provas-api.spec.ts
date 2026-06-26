import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./api";
import {
  listProvas,
  getProva,
  createProva,
  updateProva,
  deleteProva,
  createProvaFromParsed,
  parseProvaUpload,
  type CreateProvaInput,
} from "./provas-api";

vi.mock("./api", () => ({
  apiFetch: vi.fn(() => Promise.resolve("RESULT")),
  resolveApiUrl: () => "/api",
  getToken: () => "tok",
}));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

const input: CreateProvaInput = { titulo: "P1", questaoIds: ["q1", "q2"] };

describe("provas-api CRUD", () => {
  it("lists provas", async () => {
    await listProvas();
    expect(mockApiFetch).toHaveBeenCalledWith("/provas");
  });

  it("gets a prova by id", async () => {
    await getProva("p1");
    expect(mockApiFetch).toHaveBeenCalledWith("/provas/p1");
  });

  it("creates a prova", async () => {
    await createProva(input);
    expect(mockApiFetch).toHaveBeenCalledWith("/provas", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

  it("updates a prova", async () => {
    await updateProva("p1", { titulo: "novo" });
    expect(mockApiFetch).toHaveBeenCalledWith("/provas/p1", {
      method: "PATCH",
      body: JSON.stringify({ titulo: "novo" }),
    });
  });

  it("deletes a prova", async () => {
    await deleteProva("p1");
    expect(mockApiFetch).toHaveBeenCalledWith("/provas/p1", { method: "DELETE" });
  });

  it("creates a prova from parsed questions", async () => {
    await createProvaFromParsed({ titulo: "P", questoes: [] });
    expect(mockApiFetch).toHaveBeenCalledWith("/provas/from-parsed", {
      method: "POST",
      body: JSON.stringify({ titulo: "P", questoes: [] }),
    });
  });
});

describe("parseProvaUpload", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uploads both files as multipart with the bearer token and returns the json", async () => {
    const result = { tituloSugerido: "X", questoes: [] };
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(result) });

    const out = await parseProvaUpload(
      new File(["a"], "prova.pdf"),
      new File(["b"], "gab.pdf"),
    );

    expect(out).toEqual(result);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/provas/parse-upload");
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("throws with the server message on a failed upload", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: "Bad",
      json: () => Promise.resolve({ message: "arquivo inválido" }),
    });

    await expect(
      parseProvaUpload(new File(["a"], "p.pdf"), new File(["b"], "g.pdf")),
    ).rejects.toThrow("arquivo inválido");
  });
});
