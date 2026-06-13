import { describe, it, expect } from "vitest";
import {
  serializeNode,
  parseNode,
  paraFolder,
  nodeRelPath,
  vaultNodeLabel,
  type VaultNode,
} from "./vault-format";

function roundtrip(n: VaultNode): VaultNode {
  const parsed = parseNode(serializeNode(n));
  expect(parsed).not.toBeNull();
  return parsed!;
}

describe("vault-format — mapeamento PARA", () => {
  it("Baralho → Projects, Assunto → Areas, resto → Resources", () => {
    expect(paraFolder("BARALHO")).toBe("Projects");
    expect(paraFolder("ASSUNTO")).toBe("Areas");
    expect(paraFolder("TOPICO")).toBe("Resources");
    expect(paraFolder("CONCEITO")).toBe("Resources");
    expect(paraFolder("NOTA")).toBe("Resources");
    expect(paraFolder("FLASHCARD")).toBe("Resources");
    expect(paraFolder("TEXTO_BRUTO")).toBe("Resources");
  });

  it("nodeRelPath usa a pasta PARA + slug + id", () => {
    const n: VaultNode = { id: "abc123", tipo: "CONCEITO", grafoId: "g1", nome: "Habeas Corpus", relacoes: [] };
    expect(nodeRelPath(n)).toBe("Resources/habeas-corpus--abc123.md");
  });
});

describe("vault-format — round-trip", () => {
  it("CONCEITO com descrição e relação preserva campos", () => {
    const n: VaultNode = {
      id: "c1",
      tipo: "CONCEITO",
      grafoId: "g1",
      nome: "Federalismo",
      descricao: "Forma de organização do Estado.",
      nivelDominio: 0.4,
      posicaoX: 10,
      posicaoY: 20,
      relacoes: [{ rel: "PERTENCE_A", alvo: "t1", peso: 1 }],
    };
    const r = roundtrip(n);
    expect(r.id).toBe("c1");
    expect(r.tipo).toBe("CONCEITO");
    expect(r.grafoId).toBe("g1");
    expect(r.nome).toBe("Federalismo");
    expect(r.descricao).toBe("Forma de organização do Estado.");
    expect(r.nivelDominio).toBe(0.4);
    expect(r.posicaoX).toBe(10);
    expect(r.posicaoY).toBe(20);
    expect(r.relacoes).toEqual([{ rel: "PERTENCE_A", alvo: "t1", peso: 1 }]);
  });

  it("FLASHCARD preserva pergunta e resposta", () => {
    const n: VaultNode = {
      id: "f1",
      tipo: "FLASHCARD",
      grafoId: "g1",
      pergunta: "O que é habeas corpus?",
      resposta: "Remédio constitucional contra prisão ilegal.",
      relacoes: [{ rel: "HERDA", alvo: "c1", peso: 1 }],
    };
    const r = roundtrip(n);
    expect(r.pergunta).toBe("O que é habeas corpus?");
    expect(r.resposta).toBe("Remédio constitucional contra prisão ilegal.");
    expect(r.relacoes[0]).toEqual({ rel: "HERDA", alvo: "c1", peso: 1 });
  });

  it("NOTA preserva título, conteúdo e metadados Zettelkasten", () => {
    const n: VaultNode = {
      id: "n1",
      tipo: "NOTA",
      grafoId: "g1",
      titulo: "SVM maximiza a margem",
      conteudo: "# SVM\n\nA **margem** é maximizada entre classes.",
      tipoNota: "PERMANENTE",
      subtipo: "DEFINICAO",
      relacoes: [],
    };
    const r = roundtrip(n);
    expect(r.titulo).toBe("SVM maximiza a margem");
    expect(r.conteudo).toBe("# SVM\n\nA **margem** é maximizada entre classes.");
    expect(r.tipoNota).toBe("PERMANENTE");
    expect(r.subtipo).toBe("DEFINICAO");
  });

  it("wikilinks são gravados e lidos sem os colchetes", () => {
    const n: VaultNode = {
      id: "a1",
      tipo: "ASSUNTO",
      grafoId: "g1",
      nome: "Direito",
      relacoes: [{ rel: "APLICADO_EM", alvo: "alvo-xyz", peso: 2 }],
    };
    const serialized = serializeNode(n);
    expect(serialized).toContain("[[alvo-xyz]]");
    const r = parseNode(serialized)!;
    expect(r.relacoes[0].alvo).toBe("alvo-xyz");
    expect(r.relacoes[0].peso).toBe(2);
  });

  it("label de exibição respeita o tipo", () => {
    expect(vaultNodeLabel({ id: "x", tipo: "CONCEITO", grafoId: "g", nome: "Soberania", relacoes: [] })).toBe("Soberania");
    expect(vaultNodeLabel({ id: "x", tipo: "FLASHCARD", grafoId: "g", pergunta: "Q?", relacoes: [] })).toBe("Q?");
  });
});
