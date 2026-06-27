import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import {
  getNotas,
  getNotaById,
  createNotaManual,
  generateFlashcardsFromNota,
  deleteNota,
  deleteAllNotas,
  getNotasFilterData,
} from "./notes-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve("RESULT")) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

describe("notes-api date mapping", () => {
  it("getNotas converts dataCriacao strings into Date", async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: "n1", dataCriacao: "2024-01-02T00:00:00.000Z" }]);
    const [nota] = await getNotas();
    expect(mockApiFetch).toHaveBeenCalledWith("/notes");
    expect(nota.dataCriacao).toBeInstanceOf(Date);
    expect(nota.dataCriacao.toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });

  it("getNotaById maps the date, and returns null when missing", async () => {
    mockApiFetch.mockResolvedValueOnce({ id: "n1", dataCriacao: "2024-01-02T00:00:00.000Z" });
    const found = await getNotaById("n1");
    expect(mockApiFetch).toHaveBeenCalledWith("/notes/n1");
    expect(found?.dataCriacao).toBeInstanceOf(Date);

    mockApiFetch.mockResolvedValueOnce(null);
    expect(await getNotaById("missing")).toBeNull();
  });
});

describe("notes-api commands", () => {
  it("createNotaManual sends only the persisted fields", async () => {
    await createNotaManual({ titulo: "T", conteudo: "C", subtipo: "DEFINICAO", tipoNota: "PERMANENTE" });
    expect(mockApiFetch).toHaveBeenCalledWith("/notes", {
      method: "POST",
      body: JSON.stringify({ titulo: "T", conteudo: "C", subtipo: "DEFINICAO", tipoNota: "PERMANENTE" }),
    });
  });

  it("defaults subtipo to null when omitted", async () => {
    await createNotaManual({ titulo: "T", conteudo: "C" });
    expect(mockApiFetch).toHaveBeenCalledWith("/notes", {
      method: "POST",
      body: JSON.stringify({ titulo: "T", conteudo: "C", subtipo: null, tipoNota: undefined }),
    });
  });

  it("generates flashcards from a nota", async () => {
    await generateFlashcardsFromNota("n1");
    expect(mockApiFetch).toHaveBeenCalledWith("/notes/n1/flashcards", { method: "POST" });
  });

  it("deletes one and all notas, and fetches filter data", async () => {
    await deleteNota("n1");
    expect(mockApiFetch).toHaveBeenCalledWith("/notes/n1", { method: "DELETE" });
    await deleteAllNotas();
    expect(mockApiFetch).toHaveBeenCalledWith("/notes", { method: "DELETE" });
    await getNotasFilterData();
    expect(mockApiFetch).toHaveBeenCalledWith("/notes/filters");
  });
});
