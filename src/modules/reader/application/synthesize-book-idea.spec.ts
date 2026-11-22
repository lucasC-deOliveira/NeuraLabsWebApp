import { expect, it } from "vitest";
import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import { synthesizeBookIdea } from "./synthesize-book-idea";

class FakeBookSynthesis {
  request?: VaultChatRequest;

  ask = async (request: VaultChatRequest): Promise<VaultChatResponse> => {
    this.request = request;
    return {
      answer: "A ideia é definida na página 2 e aplicada na página 8.",
      referencedNodes: [...request.sources, { id: "unknown-page", nome: "Fabricated source", tipo: "PÁGINA" }],
    };
  };
}

it("requests a synthesis across chapters and returns only known citation links", async () => {
  const proxy = new FakeBookSynthesis();
  const references = [
    { page: 2, section: 1, transcription: "book/Livro.md", chapter: "Chapter 1", quote: "The concept is introduced here." },
    { page: 8, section: 7, transcription: "book/Livro.md", chapter: "Chapter 2", quote: "The concept is applied to a new example." },
  ];
  const result = await synthesizeBookIdea({
    mode: "explain", question: "Como a ideia evolui?", references, history: [],
  }, proxy.ask);
  expect(proxy.request?.question).toContain("definida, desenvolvida, aplicada ou contestada");
  expect(proxy.request?.sources.map(({ id }) => id)).toEqual(["book-page-2-1", "book-page-8-2"]);
  expect(result?.references).toEqual(references);
});
