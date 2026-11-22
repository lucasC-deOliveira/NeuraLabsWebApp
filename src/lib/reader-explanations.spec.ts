import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { listReaderExplanations, saveReaderExplanation } from "../../electron/reader-explanations.js";

it("links an approved answer to its page in the transcription", async () => {
  const vault = mkdtempSync(join(tmpdir(), "neuralabs-reader-notes-"));
  try {
    const bibliography = join(vault, "Resources", "Bibliografia", "Arquivos");
    mkdirSync(bibliography, { recursive: true });
    writeFileSync(join(bibliography, "Study Book.pdf"), "%PDF-fixture");
    const transcript = join(vault, "Resources", "Bibliografia", "Transcricoes", "book");
    mkdirSync(transcript, { recursive: true });
    writeFileSync(join(transcript, "Livro.md"), "[PDF original](<../../Arquivos/Study%20Book.pdf>) · Livro inteiro · Markdown\n" +
      Array.from({ length: 7 }, (_, index) => `<!-- neuralabs-reader-batch -->\n## Página ${index + 1}\nText\n`).join(""));
    const approved = { id: "11111111-1111-4111-8111-111111111111", mode: "summary", question: "What matters?", answer: "A useful summary." };
    expect(await listReaderExplanations(vault, "Study Book.pdf", 7)).toEqual([]);
    const note = await saveReaderExplanation(vault, "Study Book.pdf", 7, approved);
    await saveReaderExplanation(vault, "Study Book.pdf", 7, approved);
    expect(note.markdown).toContain("../../../Transcricoes/book/Livro.md#P%C3%A1gina%207");
    expect(note.source).toEqual({ transcription: "book/Livro.md", section: 6 });
    expect(note.markdown).toContain("A useful summary.");
    expect(await listReaderExplanations(vault, "Study Book.pdf", 7)).toEqual([note]);
    expect(await listReaderExplanations(vault, "Study Book.pdf", 8)).toEqual([]);
    const synthesis = await saveReaderExplanation(vault, "Study Book.pdf", 7, {
      ...approved, scope: "book", references: [{
        transcription: "book/Livro.md", section: 6, page: 7, chapter: "Chapter 1", quote: "Witness quote",
      }],
    });
    expect(synthesis.markdown).toContain("## Fontes citadas");
    expect(await listReaderExplanations(vault, "Study Book.pdf", 8)).toEqual([synthesis]);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
