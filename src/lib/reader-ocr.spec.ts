import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadReaderOcr, saveReaderOcr } from "../../electron/reader-ocr.js";

let vault: string;
let document: string;

class FakeLocalOcr {
  request(): Promise<Response> {
    return Promise.resolve(Response.json({ lines: [{ text: "Recognized text", confidence: 0.98, bounds: [] }] }));
  }
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "neuralabs-ocr-"));
  const directory = join(vault, "Resources", "Bibliografia", "Arquivos");
  mkdirSync(directory, { recursive: true });
  document = join(directory, "Book.pdf");
  writeFileSync(document, "%PDF");
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(vault, { recursive: true, force: true });
});

describe("reader OCR cache", () => {
  it("preserves page text for offline lookup and invalidates it when the PDF changes", async () => {
    const engine = new FakeLocalOcr();
    vi.stubGlobal("fetch", engine.request.bind(engine));
    const { revision } = await loadReaderOcr(vault, "Book.pdf");
    await saveReaderOcr(vault, { relative: "Book.pdf", revision, page: 3, language: "en", image: new Uint8Array([1]) });
    vi.unstubAllGlobals();
    expect((await loadReaderOcr(vault, "Book.pdf")).pages).toMatchObject([{ page: 3, language: "en", text: "Recognized text" }]);
    writeFileSync(document, "%PDF-edited");
    expect((await loadReaderOcr(vault, "Book.pdf")).pages).toEqual([]);
  });
});
