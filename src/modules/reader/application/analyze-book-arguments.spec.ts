import { expect, it } from "vitest";
import type { BookArgumentBatchRequest } from "@contracts/book-arguments";
import { analyzeBookArguments, type BookArgumentProgress } from "./analyze-book-arguments";

const thesis = "Retrieval practice improves long-term memory.";
const finding = "Students who took a quiz recalled more a week later.";

class FakeArgumentModel {
  readonly requests: BookArgumentBatchRequest[] = [];

  analyze = async (request: BookArgumentBatchRequest): Promise<unknown> => {
    this.requests.push(request);
    if (this.requests.length === 1) {
      return { ideas: [{ id: "claim", title: "Prática de recuperação", quote: thesis, role: "thesis" }], connections: [] };
    }
    return {
      ideas: [
        { id: "study", title: "Resultado dos testes", quote: finding, role: "evidence" },
        { id: "invented", title: "Fato inventado", quote: "An invented statement without textual evidence.", role: "argument" },
      ],
      connections: [
        { from: "study", to: "idea-1", quote: finding, rationale: "O teste melhora a recordação.", kind: "supports" },
        { from: "study", to: "invented", quote: finding, rationale: "A ligação aponta para uma ideia sem citação.", kind: "illustrates" },
      ],
      study: [
        { kind: "note", concept: "study", title: "Resultado", body: "O teste ajudou a recordar.", quote: finding },
        { kind: "flashcard", concept: "study", title: "Qual grupo lembrou mais?", body: "O grupo que fez um teste.", quote: finding },
        { kind: "note", concept: "study", title: "Avaliação tardia", body: "A recordação foi medida posteriormente.", quote: finding },
        { kind: "flashcard", concept: "study", title: "Quando foi medida a recordação?", body: "Uma semana depois.", quote: finding },
        { kind: "flashcard", concept: "study", title: "Qual atividade antecedeu a medição?", body: "Um teste.", quote: finding },
        { kind: "note", concept: "invented", title: "Invalid idea", body: "Unsupported.", quote: finding },
      ],
    };
  };
}

it("connects ideas across chapters and drops suggestions without literal source evidence", async () => {
  const model = new FakeArgumentModel();
  const chapters = [`## Introduction\n${thesis}`, `## Páginas 31–60\n## Results\n${finding}`];
  const progress: BookArgumentProgress[] = [];
  const report = (entry: BookArgumentProgress): void => { progress.push(entry); };
  const draft = await analyzeBookArguments(chapters, model.analyze, report, new AbortController().signal);
  expect(progress.map(({ phase, completed }) => [phase, completed])).toEqual([
    ["generating", 0], ["checking", 0], ["generating", 1], ["checking", 1], ["review", 2],
  ]);
  expect(model.requests[1].priorIdeas).toEqual([{ key: "idea-1", title: "Prática de recuperação", role: "thesis" }]);
  expect(draft.ideas).toHaveLength(2);
  expect(draft.study?.map(({ kind, concept, section }) => [kind, concept, section]))
    .toEqual([
      ["note", "idea-2", 1], ["flashcard", "idea-2", 1], ["note", "idea-2", 1],
      ["flashcard", "idea-2", 1], ["flashcard", "idea-2", 1],
    ]);
  expect(draft.connections).toEqual([{
    from: "idea-2", to: "idea-1", type: "REFORCA", kind: "supports", quote: finding,
    rationale: "O teste melhora a recordação.", chapter: "Results", section: 1,
  }]);
});
