import { describe, it, expect } from "vitest";
import {
  matchesConceptTags,
  matchesTagText,
  conceptTagOptions,
  topicosOfAssunto,
  type ConceptTagLike,
  type ConceptTagFilter,
} from "./concept-tag-filters";

function tag(over: Partial<ConceptTagLike> = {}): ConceptTagLike {
  return {
    conceito: "Fotossintese",
    topico: "Celula",
    topicoId: "t1",
    assunto: "Biologia",
    assuntoId: "a1",
    ...over,
  };
}

const item = (...tags: ConceptTagLike[]) => ({ conceitosConectados: tags });
const filter = (over: Partial<ConceptTagFilter> = {}): ConceptTagFilter => ({
  assuntoId: "",
  topicoId: "",
  conceito: "",
  ...over,
});

describe("matchesTagText", () => {
  it("matches the concept, topic or subject", () => {
    expect(matchesTagText([tag()], "fotossin")).toBe(true);
    expect(matchesTagText([tag()], "celula")).toBe(true);
    expect(matchesTagText([tag()], "biolog")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesTagText([tag()], "quimica")).toBe(false);
  });

  it("does not match when there are no tags", () => {
    expect(matchesTagText([], "bio")).toBe(false);
  });
});

describe("matchesConceptTags", () => {
  it("keeps everything when no level is filtered", () => {
    expect(matchesConceptTags(item(), filter())).toBe(true);
    expect(matchesConceptTags(item(tag()), filter())).toBe(true);
  });

  it("matches by subject, topic or concept", () => {
    expect(matchesConceptTags(item(tag()), filter({ assuntoId: "a1" }))).toBe(true);
    expect(matchesConceptTags(item(tag()), filter({ topicoId: "t1" }))).toBe(true);
    expect(matchesConceptTags(item(tag()), filter({ conceito: "Fotossintese" }))).toBe(true);
  });

  it("rejects an item with no tag for the filtered level", () => {
    expect(matchesConceptTags(item(tag()), filter({ assuntoId: "outro" }))).toBe(false);
    expect(matchesConceptTags(item(), filter({ assuntoId: "a1" }))).toBe(false);
  });

  it("matches an item connected to several concepts by any of them", () => {
    const multi = item(tag({ assuntoId: "a1" }), tag({ conceito: "Genes", assuntoId: "a9" }));
    expect(matchesConceptTags(multi, filter({ assuntoId: "a9" }))).toBe(true);
  });

  it("requires every filtered level at once", () => {
    const it1 = item(tag({ assuntoId: "a1", topicoId: "t1" }));
    expect(matchesConceptTags(it1, filter({ assuntoId: "a1", topicoId: "t9" }))).toBe(false);
  });
});

describe("conceptTagOptions", () => {
  it("lists distinct levels, sorted by name", () => {
    const items = [
      item(tag({ conceito: "Zeta", topico: "T2", topicoId: "t2" })),
      item(tag({ conceito: "Alpha" })),
    ];
    const options = conceptTagOptions(items);
    expect(options.assuntos).toEqual([{ id: "a1", nome: "Biologia" }]);
    expect(options.topicos.map((t) => t.nome)).toEqual(["Celula", "T2"]);
    expect(options.conceitos).toEqual(["Alpha", "Zeta"]);
  });

  it("has no options when nothing is tagged", () => {
    expect(conceptTagOptions([item()])).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });

  it("ignores levels with no id (concept without parents)", () => {
    const loose = item(tag({ topicoId: "", assunto: "", assuntoId: "" }));
    const options = conceptTagOptions([loose]);
    expect(options.assuntos).toEqual([]);
    expect(options.topicos).toEqual([]);
    expect(options.conceitos).toEqual(["Fotossintese"]);
  });
});

describe("topicosOfAssunto", () => {
  const options = conceptTagOptions([
    item(tag({ topicoId: "t1", assuntoId: "a1" })),
    item(tag({ topico: "Organica", topicoId: "t2", assunto: "Química", assuntoId: "a2" })),
  ]);

  it("offers every topic when no subject is chosen", () => {
    expect(topicosOfAssunto(options, "")).toHaveLength(2);
  });

  it("offers only the topics of the chosen subject", () => {
    expect(topicosOfAssunto(options, "a2").map((t) => t.id)).toEqual(["t2"]);
  });
});
