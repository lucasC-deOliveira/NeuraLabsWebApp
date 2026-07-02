import { describe, it, expect } from "vitest";
import { parseGraphImport } from "./graph-json-import";

describe("parseGraphImport", () => {
  it("parses a valid nodes+edges payload", () => {
    const raw = JSON.stringify({
      nodes: [
        { ref: "c1", tipo: "CONCEITO", nome: "HTTP" },
        { ref: "t1", tipo: "TOPICO", nome: "Protocolos" },
      ],
      edges: [{ origem: "c1", destino: "t1", relacao: "PERTENCE_A", peso: 1 }],
    });
    const payload = parseGraphImport(raw);
    expect(payload.nodes).toHaveLength(2);
    expect(payload.nodes[0]).toMatchObject({ ref: "c1", tipo: "CONCEITO", nome: "HTTP" });
    expect(payload.edges[0]).toMatchObject({ origem: "c1", destino: "t1", relacao: "PERTENCE_A", peso: 1 });
  });

  it("derives a NOTA title from its content when titulo is missing", () => {
    const raw = JSON.stringify({
      nodes: [{ ref: "n1", tipo: "NOTA", conteudo: "# Título derivado\n\ncorpo", subtipo: "DEFINICAO" }],
      edges: [],
    });
    const payload = parseGraphImport(raw);
    expect(payload.nodes[0].titulo).toBe("Título derivado");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseGraphImport("not json")).toThrow(/JSON inválido/);
  });

  it("throws when a node has an unknown tipo", () => {
    const raw = JSON.stringify({ nodes: [{ ref: "x", tipo: "WAT", nome: "?" }], edges: [] });
    expect(() => parseGraphImport(raw)).toThrow(/"tipo" inválido/);
  });

  it("throws when an edge uses a relation not allowed between the node types", () => {
    const raw = JSON.stringify({
      nodes: [
        { ref: "c1", tipo: "CONCEITO", nome: "A" },
        { ref: "c2", tipo: "CONCEITO", nome: "B" },
      ],
      edges: [{ origem: "c1", destino: "c2", relacao: "CONTEM" }],
    });
    expect(() => parseGraphImport(raw)).toThrow(/não permitida/);
  });

  it("rejects an empty nodes array", () => {
    expect(() => parseGraphImport(JSON.stringify({ nodes: [], edges: [] }))).toThrow(/ao menos um nó/);
  });
});
