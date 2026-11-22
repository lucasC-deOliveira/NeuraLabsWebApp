import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importLibraryPdf, listLibraryPdfs, readLibraryPdf } from "../../electron/vault-library-pdfs.js";

let vault: string;

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "neuralabs-reader-"));
  const library = join(vault, "Resources", "Bibliografia", "Arquivos");
  mkdirSync(join(library, "Manuals"), { recursive: true });
  writeFileSync(join(library, "Manuals", "Guide.PDF"), "%PDF");
  writeFileSync(join(library, "Notes.md"), "Ignore");
  writeFileSync(join(vault, "outside.pdf"), "Outside");
});

afterEach(() => rmSync(vault, { recursive: true, force: true }));

describe("vault PDF library", () => {
  it("lists only bibliography PDFs and reads the selected file as bytes", async () => {
    expect(await listLibraryPdfs(vault)).toEqual([{ path: "Manuals/Guide.PDF", name: "Guide.PDF" }]);
    expect(new TextDecoder().decode(await readLibraryPdf(vault, "Manuals/Guide.PDF"))).toBe("%PDF");
  });

  it("rejects traversal beyond the bibliography", async () => {
    await expect(readLibraryPdf(vault, "../../../outside.pdf")).rejects.toThrow("relative PDF path");
  });

  it("imports PDFs without moving originals or overwriting books with the same name", async () => {
    const source = join(vault, "New book.pdf");
    writeFileSync(source, "%PDF-1.7 first version");
    expect(await importLibraryPdf(vault, source)).toEqual({ path: "New book.pdf", name: "New book.pdf" });
    writeFileSync(source, "%PDF-1.7 second version");
    expect(await importLibraryPdf(vault, source)).toEqual({ path: "New book (2).pdf", name: "New book (2).pdf" });
    expect(new TextDecoder().decode(await readLibraryPdf(vault, "New book.pdf"))).toContain("first version");
    expect(readFileSync(source, "utf8")).toContain("second version");
  });
});
