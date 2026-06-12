import { describe, it, expect } from "vitest";
import { buildRoadmap, statusOf } from "./roadmap.service";

const node = (id: string, group: string, dominio = 0, label = id) => ({ id, group, dominio, label });
const edge = (source: string, target: string, type: string, peso = 1) => ({ source, target, type, peso });

const PERTENCE = (child: string, parent: string) => edge(child, parent, "PERTENCE_A");

describe("statusOf", () => {
  it("classifica por maestria", () => {
    expect(statusOf(0.9)).toBe("mastered");
    expect(statusOf(0.7)).toBe("mastered");
    expect(statusOf(0.5)).toBe("partial");
    expect(statusOf(0.3)).toBe("partial");
    expect(statusOf(0.1)).toBe("todo");
    expect(statusOf(0)).toBe("todo");
  });
});

describe("buildRoadmap — hierarquia", () => {
  const nodes = [
    node("A1", "ASSUNTO", 0),
    node("T1", "TOPICO", 0.1),
    node("T2", "TOPICO", 0.9),
    node("C1", "CONCEITO", 0.8),
    node("C2", "CONCEITO", 0.2),
  ];
  const edges = [
    PERTENCE("T1", "A1"),
    PERTENCE("T2", "A1"),
    PERTENCE("C1", "T1"),
    PERTENCE("C2", "T1"),
  ];

  it("agrupa Assunto › Tópico › Conceito", () => {
    const r = buildRoadmap(nodes, edges);
    expect(r.sections).toHaveLength(1);
    const s = r.sections[0];
    expect(s.label).toBe("A1");
    expect(s.topics.map((t) => t.id).sort()).toEqual(["T1", "T2"]);
    const t1 = s.topics.find((t) => t.id === "T1")!;
    expect(t1.concepts.map((c) => c.id).sort()).toEqual(["C1", "C2"]);
  });

  it("conta total e dominados", () => {
    const r = buildRoadmap(nodes, edges);
    expect(r.total).toBe(4); // T1,T2,C1,C2
    expect(r.mastered).toBe(2); // T2 (0.9) e C1 (0.8)
  });

  it("define status por domínio", () => {
    const r = buildRoadmap(nodes, edges);
    const t1 = r.sections[0].topics.find((t) => t.id === "T1")!;
    expect(t1.status).toBe("todo");
    expect(t1.concepts.find((c) => c.id === "C1")!.status).toBe("mastered");
    expect(t1.concepts.find((c) => c.id === "C2")!.status).toBe("todo");
  });
});

describe("buildRoadmap — ordem por pré-requisitos", () => {
  it("DEPENDE_DE coloca o fundamento antes do dependente", () => {
    const nodes = [
      node("A1", "ASSUNTO"),
      node("T1", "TOPICO", 0.5),
      node("T2", "TOPICO", 0.5),
    ];
    // T2 depende de T1 → T1 deve vir antes
    const edges = [PERTENCE("T1", "A1"), PERTENCE("T2", "A1"), edge("T2", "T1", "DEPENDE_DE")];
    const r = buildRoadmap(nodes, edges);
    expect(r.sections[0].topics.map((t) => t.id)).toEqual(["T1", "T2"]);
  });

  it("PREREQUISITO entre conceitos: a origem (pré-req) vem antes", () => {
    const nodes = [
      node("T1", "TOPICO"),
      node("Cbase", "CONCEITO", 0.5),
      node("Cdep", "CONCEITO", 0.5),
    ];
    const edges = [
      PERTENCE("Cbase", "T1"),
      PERTENCE("Cdep", "T1"),
      edge("Cbase", "Cdep", "PREREQUISITO"),
    ];
    const r = buildRoadmap(nodes, edges);
    const t1 = r.sections[0].topics.find((t) => t.id === "T1")!;
    expect(t1.concepts.map((c) => c.id)).toEqual(["Cbase", "Cdep"]);
  });

  it("sem pré-requisito: ordena por urgência (menos domínio primeiro)", () => {
    const nodes = [
      node("A1", "ASSUNTO"),
      node("Tforte", "TOPICO", 0.9),
      node("Tfraco", "TOPICO", 0.1),
    ];
    const edges = [PERTENCE("Tforte", "A1"), PERTENCE("Tfraco", "A1")];
    const r = buildRoadmap(nodes, edges);
    expect(r.sections[0].topics.map((t) => t.id)).toEqual(["Tfraco", "Tforte"]);
  });

  it("peso (importância) desempata urgência com mesmo domínio", () => {
    const nodes = [
      node("A1", "ASSUNTO"),
      node("Timportante", "TOPICO", 0.4),
      node("Tsimples", "TOPICO", 0.4),
      node("X", "CONCEITO", 0),
    ];
    // Timportante tem uma relação de peso alto → mais importante → mais urgente
    const edges = [
      PERTENCE("Timportante", "A1"),
      PERTENCE("Tsimples", "A1"),
      edge("X", "Timportante", "APLICADO_EM", 9),
    ];
    const r = buildRoadmap(nodes, edges);
    expect(r.sections[0].topics[0].id).toBe("Timportante");
  });
});

describe("buildRoadmap — casos sem hierarquia", () => {
  it("conceitos sem tópico vão para a seção Geral (looseConcepts)", () => {
    const nodes = [node("C1", "CONCEITO", 0.2), node("C2", "CONCEITO", 0.6)];
    const r = buildRoadmap(nodes, []);
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].id).toBe("__geral__");
    expect(r.sections[0].looseConcepts.map((c) => c.id).sort()).toEqual(["C1", "C2"]);
  });

  it("tópico sem assunto cai na seção Geral", () => {
    const nodes = [node("T1", "TOPICO", 0.3), node("C1", "CONCEITO", 0.1)];
    const edges = [PERTENCE("C1", "T1")];
    const r = buildRoadmap(nodes, edges);
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].label).toBe("Geral");
    expect(r.sections[0].topics[0].id).toBe("T1");
  });

  it("grafo vazio: roadmap vazio", () => {
    const r = buildRoadmap([], []);
    expect(r.sections).toHaveLength(0);
    expect(r.total).toBe(0);
  });
});

describe("buildRoadmap — múltiplas seções", () => {
  it("seção com mais a estudar (maior urgência) vem primeiro", () => {
    const nodes = [
      node("Afraco", "ASSUNTO"),
      node("Tfraco", "TOPICO", 0.05),
      node("Aforte", "ASSUNTO"),
      node("Tforte", "TOPICO", 0.95),
    ];
    const edges = [PERTENCE("Tfraco", "Afraco"), PERTENCE("Tforte", "Aforte")];
    const r = buildRoadmap(nodes, edges);
    expect(r.sections.map((s) => s.label)).toEqual(["Afraco", "Aforte"]);
  });
});
