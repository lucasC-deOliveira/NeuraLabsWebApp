import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listReaderTranscriptions, readReaderTranscription, readReaderTranscriptionImage, trashReaderTranscription } from "../../electron/reader-transcriptions.js";

let vault: string;
const book = "Book (demo).pdf";
const excerpt = "extract/Livro.md";

class UnavailableSystemTrash {
  async move(target: string): Promise<void> {
    throw new Error(`Cannot move "${target}". Expected an available system trash.`);
  }
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "neuralabs-transcriptions-"));
  const bibliography = join(vault, "Resources", "Bibliografia");
  const files = join(bibliography, "Arquivos");
  const transcriptions = join(bibliography, "Transcricoes");
  mkdirSync(files, { recursive: true });
  mkdirSync(join(transcriptions, "extract", "imagens"), { recursive: true });
  writeFileSync(join(files, book), "%PDF-1.7");
  writeFileSync(join(files, "Other.pdf"), "%PDF-1.7");
  writeFileSync(join(transcriptions, excerpt), "[PDF original](<../../Arquivos/Book%20(demo).pdf#page=2>) · Páginas 2–4 do PDF\n\n## Preserved heading");
  writeFileSync(join(transcriptions, "legacy-ocr.md"), "# Book\n\n[PDF original](../Arquivos/Book%20%28demo%29.pdf) · Idioma do OCR: Inglês");
  writeFileSync(join(transcriptions, "extract", "imagens", "figure.png"), Buffer.from("iVBORw0KGgo=", "base64"));
});

afterEach(() => rmSync(vault, { recursive: true, force: true }));

describe("linked reader transcriptions", () => {
  it("finds earlier OCR and structured exports by their original PDF links", async () => {
    expect(await listReaderTranscriptions(vault, book)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: excerpt, first: 2, last: 4 }),
      expect.objectContaining({ id: "legacy-ocr.md", first: null, last: null }),
    ]));
    expect(await listReaderTranscriptions(vault, "Other.pdf")).toEqual([]);
  });

  it("opens only the book's own transcription and local figures", async () => {
    expect(await readReaderTranscription(vault, book, excerpt)).toContain("## Preserved heading");
    expect(await readReaderTranscriptionImage(vault, book, excerpt, "figure.png")).toBe("iVBORw0KGgo=");
    expect(await readReaderTranscriptionImage(vault, book, excerpt, "../figure.png")).toBeNull();
    await expect(readReaderTranscription(vault, "Other.pdf", excerpt)).rejects.toThrow("Unknown transcription");
  });

  it("trashes the requested linked Markdown without touching unrelated files", async () => {
    const trash = vi.fn(async () => undefined);
    await trashReaderTranscription(vault, book, excerpt, trash);
    expect(trash).toHaveBeenCalledWith(join(vault, "Resources", "Bibliografia", "Transcricoes", excerpt));
    await expect(trashReaderTranscription(vault, "Other.pdf", excerpt, trash)).rejects.toThrow("Unknown transcription");
    expect(trash).toHaveBeenCalledTimes(1);
  });

  it("moves a complete export into recoverable vault storage when system trash fails", async () => {
    const bibliography = join(vault, "Resources", "Bibliografia");
    const directory = join(bibliography, "Transcricoes");
    const figure = join("extract", "imagens", "image_1_abc.png");
    rmSync(join(directory, "extract", "imagens", "figure.png"));
    writeFileSync(join(directory, figure), "generated figure");
    const system = new UnavailableSystemTrash();
    expect(await trashReaderTranscription(vault, book, excerpt, system.move)).toBe("vault");
    const trash = join(directory, ".lixeira");
    const [entry] = readdirSync(trash);
    expect(readFileSync(join(trash, entry, excerpt), "utf8")).toContain("Preserved heading");
    expect(readFileSync(join(trash, entry, figure), "utf8")).toBe("generated figure");
    expect(readFileSync(join(bibliography, "Arquivos", book), "utf8")).toBe("%PDF-1.7");
    expect(await listReaderTranscriptions(vault, book)).toEqual([expect.objectContaining({ id: "legacy-ocr.md" })]);
  });
});
