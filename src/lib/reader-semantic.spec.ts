import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { findReaderBookEvidence, searchReaderTranscription } from "../../electron/reader-semantic.js";

class FakeReaderEncoder {
  readonly batches: string[][] = [];

  embed = async (passages: string[]): Promise<number[][]> => {
    this.batches.push(passages);
    return passages.map((text) => /climate|clima/u.test(text) ? [1, 0] : [0, 1]);
  };
}

it("ranks related passages, preserves their destination and rebuilds after edits", async () => {
  const vault = mkdtempSync(join(tmpdir(), "neuralabs-reader-search-"));
  try {
    const library = join(vault, "Resources", "Bibliografia");
    mkdirSync(join(library, "Arquivos"), { recursive: true });
    mkdirSync(join(library, "Transcricoes", "book"), { recursive: true });
    writeFileSync(join(library, "Arquivos", "Book.pdf"), "");
    const transcription = join(library, "Transcricoes", "book", "Livro.md");
    const intro = "[PDF original](<../../Arquivos/Book.pdf>)\n<!-- neuralabs-reader-batch -->\n";
    writeFileSync(transcription, intro + "## Páginas 1–30\nHistory of trade and shipping.\n<!-- neuralabs-reader-batch -->\n## Páginas 31–42\nChanging climate patterns.");
    const encoder = new FakeReaderEncoder();
    const search = (): ReturnType<typeof searchReaderTranscription> =>
      searchReaderTranscription(vault, "Book.pdf", "book/Livro.md", "mudanças no clima", encoder.embed);
    expect((await search())[0]).toMatchObject({ section: 1, label: "Páginas 31–42" });
    await search();
    expect(encoder.batches).toHaveLength(3);
    writeFileSync(transcription, intro + "## Páginas 1–42\nChanging climate patterns.");
    expect((await search())[0]).toMatchObject({ section: 0 });
    expect(encoder.batches).toHaveLength(5);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

it("selects one piece of evidence per page and keeps the chapter and page destinations", async () => {
  const vault = mkdtempSync(join(tmpdir(), "neuralabs-book-evidence-"));
  try {
    const library = join(vault, "Resources", "Bibliografia");
    mkdirSync(join(library, "Arquivos"), { recursive: true });
    mkdirSync(join(library, "Transcricoes", "book"), { recursive: true });
    writeFileSync(join(library, "Arquivos", "Book.pdf"), "");
    const marker = "<!-- neuralabs-reader-batch -->\n";
    writeFileSync(join(library, "Transcricoes", "book", "Livro.md"),
      "[PDF original](<../../Arquivos/Book.pdf>)\n" +
      marker + "## Página 1\n## Chapter 1\n" + "The climate description begins here. ".repeat(30) + "\n" +
      marker + "## Página 2\nThe climate example continues here.\n" +
      marker + "## Página 3\n## Chapter 2\nThe climate objection begins here.");
    const evidence = await findReaderBookEvidence(vault, "Book.pdf", "book/Livro.md", "climate", new FakeReaderEncoder().embed);
    expect(evidence.map(({ section, chapter }) => [section, chapter]))
      .toEqual([[0, "Chapter 1"], [1, "Chapter 1"], [2, "Chapter 2"]]);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
