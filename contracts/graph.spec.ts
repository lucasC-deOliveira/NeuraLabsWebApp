import { describe, it, expect } from "vitest";
import { BARALHO_TITULO_MAX } from "@contracts/baralhos";
import {
  MAX_DECK_FLASHCARDS,
  createEdgeContract,
  createNodeContract,
  importGraphContract,
  updateNodeContract,
  vaultSyncContract,
  createGraphBaralhoContract,
  createGraphContract,
  extractSubgraphContract,
  graphPositionsContract,
  linkNodeContract,
  updateEdgeContract,
} from "@contracts/graph";

describe("createGraphContract", () => {
  it("exige o nome e apara", () => {
    expect(createGraphContract.safeParse({ nome: "   " }).success).toBe(false);
    expect(createGraphContract.parse({ nome: "  Biologia  " }).nome).toBe("Biologia");
  });

  it("deixa a descrição opcional", () => {
    expect(createGraphContract.safeParse({ nome: "Bio" }).success).toBe(true);
  });
});

describe("linkNodeContract", () => {
  it("aceita os tipos de nó conhecidos", () => {
    expect(linkNodeContract.safeParse({ tipoNode: "CONCEITO", entityId: "c1" }).success).toBe(true);
  });

  it("recusa um tipo de nó inventado, em vez de repassar para o banco", () => {
    expect(linkNodeContract.safeParse({ tipoNode: "PLANILHA", entityId: "c1" }).success).toBe(false);
  });
});

describe("createGraphBaralhoContract", () => {
  it("assume lista vazia de cards", () => {
    expect(createGraphBaralhoContract.parse({ titulo: "Bio" }).flashcardIds).toEqual([]);
  });

  it("aplica o teto de flashcards do normalizeDeckCreation", () => {
    const ids = Array.from({ length: MAX_DECK_FLASHCARDS + 1 }, (_, i) => `f${i}`);
    expect(createGraphBaralhoContract.safeParse({ titulo: "Bio", flashcardIds: ids }).success).toBe(false);
    expect(createGraphBaralhoContract.safeParse({ titulo: "Bio", flashcardIds: ids.slice(1) }).success).toBe(true);
  });

  // Esta rota NÃO tem o teto de 120 do módulo baralhos — a divergência é real e
  // fica registrada aqui até virar decisão de produto.
  it("aceita título maior que o teto do módulo baralhos, como o backend faz hoje", () => {
    const longo = { titulo: "x".repeat(BARALHO_TITULO_MAX + 1) };
    expect(createGraphBaralhoContract.safeParse(longo).success).toBe(true);
  });
});

describe("createEdgeContract / updateEdgeContract", () => {
  const aresta = { sourceNodeId: "a", targetNodeId: "b", tipoRelacao: "PERTENCE_A" };

  it("aceita uma aresta completa", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0.5 }).success).toBe(true);
  });

  // A faixa vem do sistema, não de invenção: vault-sync.ts e graph-json-import.ts
  // já tratam 0 < peso <= 2, e um teste do backend usa peso 2.
  it("aceita a faixa de peso que o resto do sistema já trata", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 2 }).success).toBe(true);
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0.5 }).success).toBe(true);
  });

  it("recusa peso fora dessa faixa", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0 }).success).toBe(false);
    expect(createEdgeContract.safeParse({ ...aresta, peso: 2.5 }).success).toBe(false);
    expect(createEdgeContract.safeParse({ ...aresta, peso: -1 }).success).toBe(false);
  });

  it("exige as duas pontas da aresta", () => {
    expect(createEdgeContract.safeParse({ ...aresta, sourceNodeId: "" }).success).toBe(false);
  });

  it("permite atualizar só o peso", () => {
    expect(updateEdgeContract.safeParse({ peso: 1 }).success).toBe(true);
  });
});

describe("graphPositionsContract", () => {
  it("aceita o mapa de posições por id", () => {
    expect(graphPositionsContract.safeParse({ positions: { n1: { x: 1, y: 2 } } }).success).toBe(true);
  });

  it("recusa posição sem coordenada", () => {
    expect(graphPositionsContract.safeParse({ positions: { n1: { x: 1 } } }).success).toBe(false);
  });
});

describe("extractSubgraphContract", () => {
  it("exige ao menos um nó para extrair", () => {
    const base = { nome: "Recorte", tipoRelacao: "PERTENCE_A" };
    expect(extractSubgraphContract.safeParse({ ...base, nodeIds: [] }).success).toBe(false);
    expect(extractSubgraphContract.safeParse({ ...base, nodeIds: ["n1"] }).success).toBe(true);
  });
});

describe("createNodeContract", () => {
  it("recusa um tipo que esta rota não cria (GRAFO_REF, PROVA, QUESTION)", () => {
    expect(createNodeContract.safeParse({ tipoNode: "GRAFO_REF" }).success).toBe(false);
    expect(createNodeContract.safeParse({ tipoNode: "PROVA" }).success).toBe(false);
  });

  // assertCreatableNode NÃO cobra nada nesses tipos — o contrato copia isso em vez
  // de apertar por conta própria, o que recusaria requisição que hoje funciona.
  it("aceita os tipos sem invariante, como o backend faz hoje", () => {
    for (const tipoNode of ["ASSUNTO", "TOPICO", "CONCEITO", "FLASHCARD", "BARALHO"]) {
      expect(createNodeContract.safeParse({ tipoNode }).success, tipoNode).toBe(true);
    }
  });

  it("cobra título e subtipo da NOTA, com o texto que o usuário já via", () => {
    const parsed = createNodeContract.safeParse({ tipoNode: "NOTA" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const byPath = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    expect(byPath.titulo).toBe("O título da nota é obrigatório");
    expect(byPath.subtipo).toBe("Selecione o subtipo da nota");
  });

  it("recusa subtipo de nota fora da lista", () => {
    const nota = { tipoNode: "NOTA", titulo: "t", subtipo: "INVENTADO" };
    expect(createNodeContract.safeParse(nota).success).toBe(false);
  });

  it("exige a fonte só na nota de literatura", () => {
    const base = { tipoNode: "NOTA", titulo: "t", subtipo: "DEFINICAO" };
    expect(createNodeContract.safeParse({ ...base, tipoNota: "LITERATURA" }).success).toBe(false);
    expect(createNodeContract.safeParse({ ...base, tipoNota: "LITERATURA", fonte: "Livro" }).success).toBe(true);
    expect(createNodeContract.safeParse(base).success).toBe(true);
  });

  it("exige o texto do TEXTO_BRUTO", () => {
    expect(createNodeContract.safeParse({ tipoNode: "TEXTO_BRUTO" }).success).toBe(false);
    expect(createNodeContract.safeParse({ tipoNode: "TEXTO_BRUTO", texto: "  " }).success).toBe(false);
    expect(createNodeContract.safeParse({ tipoNode: "TEXTO_BRUTO", texto: "conteúdo" }).success).toBe(true);
  });

  it("não inventa faixa para nivelDominio — o backend não cobra nenhuma", () => {
    expect(createNodeContract.safeParse({ tipoNode: "CONCEITO", nivelDominio: 5 }).success).toBe(true);
    expect(createNodeContract.safeParse({ tipoNode: "CONCEITO", nivelDominio: 0.8 }).success).toBe(true);
  });
});

describe("updateNodeContract", () => {
  it("alcança tipos que a criação não alcança", () => {
    expect(updateNodeContract.safeParse({ tipoNode: "GRAFO_REF", nome: "x" }).success).toBe(true);
  });

  it("não repete os invariantes da criação — a edição não passa por eles", () => {
    expect(updateNodeContract.safeParse({ tipoNode: "NOTA" }).success).toBe(true);
  });

  it("exige o tipo do nó", () => {
    expect(updateNodeContract.safeParse({ nome: "x" }).success).toBe(false);
  });
});

describe("vaultSyncContract", () => {
  const node = { ref: "n1", tipo: "CONCEITO" };
  const edge = { origem: "n1", destino: "n2", relacao: "PERTENCE_A" };

  it("aceita um payload de vault mínimo", () => {
    expect(vaultSyncContract.safeParse({ nodes: [node], edges: [edge] }).success).toBe(true);
  });

  // clampPeso coage para 1 fora de (0, 2]. Rejeitar aqui quebraria o Push de um
  // arquivo editado à mão — diferente da rota de criar aresta, que recusa.
  it("não recusa peso fora da faixa, porque o vault coage em vez de rejeitar", () => {
    expect(vaultSyncContract.safeParse({ nodes: [], edges: [{ ...edge, peso: 7 }] }).success).toBe(true);
  });

  it("exige ref e tipo em cada nó", () => {
    expect(vaultSyncContract.safeParse({ nodes: [{ ref: "n1" }], edges: [] }).success).toBe(false);
  });

  // O z.object faz strip do que não está no schema: sem estes campos no contrato,
  // a questão chegaria ao backend sem enunciado, alternativas nem gabarito — e o
  // Push gravaria uma questão vazia sem nenhum erro.
  it("preserva o conteúdo da questão em vez de descartá-lo no strip", () => {
    const questao = {
      ref: "q1",
      tipo: "QUESTION",
      enunciado: "O que é um SLA?",
      alternativas: [{ letra: "A", texto: "Acordo com o cliente" }],
      gabarito: "A",
      explicacao: "OLA é interno.",
      tipoQuestao: "MULTIPLA_ESCOLHA",
    };
    const parsed = vaultSyncContract.parse({ nodes: [questao], edges: [] });
    expect(parsed.nodes[0]).toMatchObject(questao);
  });

  it("recusa alternativas fora da forma { letra, texto }, que iriam cruas para o Json", () => {
    const nodes = [{ ref: "q1", tipo: "QUESTION", alternativas: ["A", "B"] }];
    expect(vaultSyncContract.safeParse({ nodes, edges: [] }).success).toBe(false);
  });

  // O .md é editado à mão; um tipo de questão desconhecido é coagido no upsert
  // (questaoTipo → MULTIPLA_ESCOLHA), então o contrato não pode recusar.
  it("não recusa um tipoQuestao desconhecido, porque o upsert coage", () => {
    const nodes = [{ ref: "q1", tipo: "QUESTION", tipoQuestao: "DISSERTATIVA" }];
    expect(vaultSyncContract.safeParse({ nodes, edges: [] }).success).toBe(true);
  });
});

describe("importGraphContract", () => {
  it("garante as duas listas, sem opinar sobre os itens", () => {
    expect(importGraphContract.safeParse({ nodes: [], edges: [] }).success).toBe(true);
    expect(importGraphContract.safeParse({ nodes: [{ qualquer: 1 }], edges: [] }).success).toBe(true);
    expect(importGraphContract.safeParse({ nodes: "x", edges: [] }).success).toBe(false);
  });
});
