import { describe, it, expect } from "vitest";
import { deriveHierarchy, levelOf, TYPE_LEVEL } from "./graph-hierarchy";

const n = (id: string, type: string) => ({ id, type });
const e = (source: string, target: string, peso = 1) => ({ source, target, peso });

describe("levelOf / TYPE_LEVEL", () => {
  it("ordena ASSUNTO < TOPICO < CONCEITO < comuns", () => {
    expect(levelOf("ASSUNTO")).toBe(0);
    expect(levelOf("TOPICO")).toBe(1);
    expect(levelOf("CONCEITO")).toBe(2);
    expect(levelOf("FLASHCARD")).toBe(3);
    expect(levelOf("NOTA")).toBe(3);
    expect(levelOf("BARALHO")).toBe(3);
  });

  it("tipos desconhecidos caem no nível de folha (3)", () => {
    expect(levelOf("FOO")).toBe(3);
    expect(TYPE_LEVEL.ASSUNTO).toBe(0);
  });
});

describe("deriveHierarchy", () => {
  it("grafo vazio devolve mapa vazio", () => {
    expect(deriveHierarchy([], []).size).toBe(0);
  });

  it("ASSUNTO é raiz: sem pai, cluster = próprio id, subtree nível 0", () => {
    const h = deriveHierarchy([n("a", "ASSUNTO")], []);
    expect(h.get("a")).toEqual({
      parentId: undefined,
      clusterId: "a",
      subtreeIds: ["a", undefined, undefined],
    });
  });

  it("cadeia completa: comum → conceito → tópico → assunto", () => {
    const nodes = [
      n("a", "ASSUNTO"),
      n("t", "TOPICO"),
      n("c", "CONCEITO"),
      n("f", "FLASHCARD"),
    ];
    const edges = [e("a", "t"), e("t", "c"), e("c", "f")];
    const h = deriveHierarchy(nodes, edges);

    expect(h.get("t")!.parentId).toBe("a");
    expect(h.get("c")!.parentId).toBe("t");
    expect(h.get("f")!.parentId).toBe("c");
    // todos pertencem ao mesmo cluster principal (raiz = assunto)
    expect(h.get("a")!.clusterId).toBe("a");
    expect(h.get("t")!.clusterId).toBe("a");
    expect(h.get("c")!.clusterId).toBe("a");
    expect(h.get("f")!.clusterId).toBe("a");
    // subtree por nível: assunto, tópico, conceito (folha não ocupa nível)
    expect(h.get("f")!.subtreeIds).toEqual(["a", "t", "c"]);
    expect(h.get("c")!.subtreeIds).toEqual(["a", "t", "c"]);
    expect(h.get("t")!.subtreeIds).toEqual(["a", "t", undefined]);
    expect(h.get("a")!.subtreeIds).toEqual(["a", undefined, undefined]);
  });

  it("prefere o vizinho direto de nível mais próximo do filho", () => {
    // flashcard ligado a CONCEITO e a ASSUNTO ao mesmo tempo → pai = CONCEITO
    const nodes = [n("a", "ASSUNTO"), n("c", "CONCEITO"), n("f", "FLASHCARD")];
    const edges = [e("f", "c"), e("f", "a"), e("c", "a")];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("f")!.parentId).toBe("c");
    expect(h.get("c")!.parentId).toBe("a");
  });

  it("encontra pai transitivo quando não há vizinho direto de nível acima", () => {
    // flashcard ligado só a uma nota (mesmo nível); nota ligada a conceito.
    // o pai do flashcard é o conceito (nó de nível acima mais próximo via BFS).
    const nodes = [
      n("c", "CONCEITO"),
      n("nota", "NOTA"),
      n("f", "FLASHCARD"),
    ];
    const edges = [e("c", "nota"), e("nota", "f")];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("nota")!.parentId).toBe("c");
    expect(h.get("f")!.parentId).toBe("c"); // transitivo via nota
    expect(h.get("f")!.clusterId).toBe("c"); // sem assunto/tópico → raiz é o conceito
  });

  it("desempata por maior peso da aresta no vizinho direto", () => {
    const nodes = [n("t1", "TOPICO"), n("t2", "TOPICO"), n("c", "CONCEITO")];
    const edges = [e("c", "t1", 1), e("c", "t2", 5)];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("c")!.parentId).toBe("t2");
  });

  it("folha órfã NUNCA vira cluster próprio (clusterId/subtree vazios)", () => {
    const nodes = [n("f", "FLASHCARD"), n("g", "FLASHCARD")];
    const edges = [e("f", "g")]; // só liga a outra folha
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("f")!.parentId).toBeUndefined();
    expect(h.get("f")!.clusterId).toBeUndefined();
    expect(h.get("f")!.subtreeIds).toEqual([undefined, undefined, undefined]);
  });

  it("folha sob conceito orbita, mas o conceito é o cluster (não a folha)", () => {
    const nodes = [n("c", "CONCEITO"), n("f", "FLASHCARD")];
    const edges = [e("c", "f")];
    const h = deriveHierarchy(nodes, edges);
    // a folha pertence ao cluster do conceito, mas nunca é centro de nenhum nível
    expect(h.get("f")!.clusterId).toBe("c");
    expect(h.get("f")!.subtreeIds).toEqual([undefined, undefined, "c"]);
    expect(h.get("c")!.subtreeIds).toEqual([undefined, undefined, "c"]);
  });

  it("dois assuntos formam dois clusters distintos", () => {
    const nodes = [
      n("a1", "ASSUNTO"), n("t1", "TOPICO"), n("c1", "CONCEITO"),
      n("a2", "ASSUNTO"), n("t2", "TOPICO"), n("c2", "CONCEITO"),
    ];
    const edges = [
      e("a1", "t1"), e("t1", "c1"),
      e("a2", "t2"), e("t2", "c2"),
    ];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("c1")!.clusterId).toBe("a1");
    expect(h.get("c2")!.clusterId).toBe("a2");
    expect(h.get("c1")!.clusterId).not.toBe(h.get("c2")!.clusterId);
  });

  it("é determinística: mesma entrada → mesma saída", () => {
    const nodes = [n("a", "ASSUNTO"), n("t", "TOPICO"), n("c", "CONCEITO")];
    const edges = [e("a", "t"), e("t", "c")];
    expect(deriveHierarchy(nodes, edges)).toEqual(deriveHierarchy(nodes, edges));
  });

  it("root: assuntos orbitam o root; root não tem pai nem cluster", () => {
    const nodes = [
      { id: "root", type: "ASSUNTO", isRoot: true },
      n("a1", "ASSUNTO"),
      n("a2", "ASSUNTO"),
    ];
    const h = deriveHierarchy(nodes, []);
    // assuntos passam a ter o root como pai (orbitam-no), mesmo sem arestas
    expect(h.get("a1")!.parentId).toBe("root");
    expect(h.get("a2")!.parentId).toBe("root");
    // root não tem pai nem cluster, e não ocupa nenhum nível de subtree
    expect(h.get("root")!.parentId).toBeUndefined();
    expect(h.get("root")!.clusterId).toBeUndefined();
    expect(h.get("root")!.subtreeIds).toEqual([undefined, undefined, undefined]);
    // cada assunto continua sendo seu próprio cluster (não o root)
    expect(h.get("a1")!.clusterId).toBe("a1");
    expect(h.get("a2")!.clusterId).toBe("a2");
  });

  it("root: cadeia completa mantém cluster no assunto (não no root)", () => {
    const nodes = [
      { id: "root", type: "ASSUNTO", isRoot: true },
      n("a", "ASSUNTO"),
      n("t", "TOPICO"),
      n("c", "CONCEITO"),
      n("f", "FLASHCARD"),
    ];
    const edges = [e("a", "t"), e("t", "c"), e("c", "f")];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("a")!.parentId).toBe("root");
    expect(h.get("t")!.parentId).toBe("a");
    expect(h.get("f")!.parentId).toBe("c");
    // cluster e subtree continuam ancorados no assunto, nunca no root
    expect(h.get("f")!.clusterId).toBe("a");
    expect(h.get("f")!.subtreeIds).toEqual(["a", "t", "c"]);
    expect(h.get("root")!.clusterId).toBeUndefined();
  });

  it("root: nó comum órfão passa a orbitar o root (ancora tudo)", () => {
    const nodes = [
      { id: "root", type: "ASSUNTO", isRoot: true },
      n("solta", "FLASHCARD"),
    ];
    const h = deriveHierarchy(nodes, []);
    expect(h.get("solta")!.parentId).toBe("root");
    // mas ainda não vira cluster próprio (folha)
    expect(h.get("solta")!.clusterId).toBeUndefined();
  });

  it("não trava com ciclo entre nós do mesmo nível", () => {
    const nodes = [n("c", "CONCEITO"), n("d", "CONCEITO"), n("t", "TOPICO")];
    const edges = [e("c", "d"), e("d", "c"), e("c", "t")];
    const h = deriveHierarchy(nodes, edges);
    expect(h.get("c")!.parentId).toBe("t");
    expect(h.get("c")!.clusterId).toBe("t");
  });
});
