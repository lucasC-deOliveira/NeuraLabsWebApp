import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveReaderMarkdown } from "../../electron/reader-markdown.js";

let vault: string;
let original: string;

class FakeDocumentConverter {
  request(): Promise<Response> {
    const batch = { type: "pages", markdown: "# Chapter\n\n![Figure](imagens/figure.png)",
      images: [{ name: "figure.png", base64: "iVBORw0KGgo=" }] };
    const messages = [{ type: "started", total: 2 }, { ...batch, first: 1, last: 1 },
      { ...batch, first: 2, last: 2 }, { type: "finished" }];
    const body = messages.map((message) => JSON.stringify(message)).join("\n") + "\n";
    return Promise.resolve(new Response(body, { headers: { "content-type": "application/x-ndjson" } }));
  }
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "neuralabs-docling-"));
  const library = join(vault, "Resources", "Bibliografia", "Arquivos");
  mkdirSync(library, { recursive: true });
  original = join(library, "Book.pdf");
  writeFileSync(original, "%PDF-original");
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(vault, { recursive: true, force: true });
});

describe("local PDF to Markdown conversion", () => {
  it("saves Markdown with relative figures and retains the source", async () => {
    const converter = new FakeDocumentConverter();
    vi.stubGlobal("fetch", converter.request.bind(converter));
    const request = { relative: "Book.pdf", language: "en", jobId: "00000000-0000-4000-8000-000000000000" };
    const exportFile = await saveReaderMarkdown(vault, request);
    const markdown = readFileSync(join(vault, exportFile.markdownPath), "utf8");
    expect(markdown).toContain("../../Arquivos/Book.pdf");
    expect(markdown).toContain("![Figure](imagens/p1-figure.png)");
    expect(markdown).toContain("![Figure](imagens/p2-figure.png)");
    expect(markdown).toContain("## Página 1");
    expect(markdown).toContain("## Página 2");
    expect(exportFile.imageCount).toBe(2);
    expect(readFileSync(original, "utf8")).toBe("%PDF-original");
    await expect(saveReaderMarkdown(vault, request)).rejects.toThrow("already has a transcription");
  });

  it("rejects invalid conversion jobs", async () => {
    await expect(saveReaderMarkdown(vault, { relative: "Book.pdf", language: "pt", jobId: "invalid" })).rejects.toThrow("Invalid book conversion");
  });
});
