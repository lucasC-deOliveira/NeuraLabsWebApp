import { expect, it } from "vitest";
import { parseNode } from "@/lib/vault-format";
import { analyzeBookSections } from "../domain/book-analysis";
import { bookAnalysisFiles } from "./save-book-analysis";

it("writes accepted edges with links to the actual quoted section", () => {
  const draft = analyzeBookSections(["", "Mitose contrasta com meiose."]);
  let next = 0;
  const files = bookAnalysisFiles("graph", { book: "A & B.pdf", transcription: "book/Livro.md" }, draft, () => String(++next));
  const origin = parseNode(files[0].content);
  expect(origin.relacoes).toEqual([{ rel: "CONTRASTA_COM", alvo: "2", peso: 1 }]);
  expect(origin.descricao).toContain("> Mitose contrasta com meiose.");
  expect(origin.descricao).toContain("book=A+%26+B.pdf&transcription=book%2FLivro.md&section=1");
  expect(parseNode(files[1].content).grafoId).toBe("graph");
});

it("writes literature notes and flashcards as native linked graph nodes", () => {
  const draft = analyzeBookSections(["Mitose é uma divisão celular."]);
  const evidence = { concept: "mitose", body: "Divisão celular.", quote: "Mitose é uma divisão celular.", section: 0 };
  draft.study = [
    { ...evidence, key: "note", kind: "note", title: "Mitose na leitura" },
    { ...evidence, key: "card", kind: "flashcard", title: "O que é mitose?" },
  ];
  let next = 0;
  const nodes = bookAnalysisFiles("graph", { book: "Book.pdf", transcription: "book/Livro.md" }, draft, () => String(++next))
    .map(({ content }) => parseNode(content));
  expect(nodes[2]).toMatchObject({ tipo: "NOTA", tipoNota: "LITERATURA", relacoes: [{ rel: "EXPLICA", alvo: "1" }] });
  expect(nodes[3]).toMatchObject({ tipo: "FLASHCARD", resposta: "Divisão celular.", relacoes: [{ rel: "HERDA", alvo: "1" }] });
  expect(nodes[3].fonte).toContain("section=0");
});
