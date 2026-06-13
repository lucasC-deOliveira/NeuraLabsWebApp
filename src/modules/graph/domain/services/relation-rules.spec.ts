import { describe, it, expect } from "vitest";
import {
  getAllowedRelations,
  canRelate,
  isRelationAllowed,
  getCanonicalDirection,
  getInsightTargets,
} from "./relation-rules";

describe("relation-rules", () => {
  describe("getAllowedRelations", () => {
    it("Nota ↔ Conceito permite as 7 relações de anotação", () => {
      const expected = [
        "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA",
        "CONTRASTA", "SINTETIZA", "ALERTA_ERRO",
      ];
      expect(getAllowedRelations("NOTA", "CONCEITO")).toEqual(expected);
    });

    it("Conceito ↔ Conceito permite as 12 relações conceituais", () => {
      const rels = getAllowedRelations("CONCEITO", "CONCEITO");
      expect(rels).toHaveLength(12);
      expect(rels).toContain("IS_A");
      expect(rels).toContain("OBJETIVO_DE");
    });

    it("Conceito ↔ Tópico permite PERTENCE_A, FUNDAMENTA, APLICADO_EM", () => {
      expect(getAllowedRelations("CONCEITO", "TOPICO")).toEqual([
        "PERTENCE_A", "FUNDAMENTA", "APLICADO_EM",
      ]);
    });

    it("Tópico ↔ Tópico permite SUBTOPICO_DE, RELACIONADO, DEPENDE_DE, EVOLUI_PARA", () => {
      expect(getAllowedRelations("TOPICO", "TOPICO")).toEqual([
        "SUBTOPICO_DE", "RELACIONADO", "DEPENDE_DE", "EVOLUI_PARA",
      ]);
    });

    it("Tópico ↔ Assunto permite PERTENCE_A e APLICADO_EM", () => {
      expect(getAllowedRelations("TOPICO", "ASSUNTO")).toEqual(["PERTENCE_A", "APLICADO_EM"]);
    });

    it("Flashcard ↔ Conceito permite HERDA (herança via nota) e as relações de Nota↔Conceito", () => {
      expect(getAllowedRelations("FLASHCARD", "CONCEITO")).toEqual([
        "HERDA", "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO",
      ]);
    });

    it("é indiferente à ordem dos tipos", () => {
      expect(getAllowedRelations("CONCEITO", "NOTA")).toEqual(getAllowedRelations("NOTA", "CONCEITO"));
      expect(getAllowedRelations("ASSUNTO", "TOPICO")).toEqual(getAllowedRelations("TOPICO", "ASSUNTO"));
      expect(getAllowedRelations("CONCEITO", "FLASHCARD")).toEqual(getAllowedRelations("FLASHCARD", "CONCEITO"));
    });

    it("Nota ↔ Tópico e Nota ↔ Assunto permitem PERTENCE_A", () => {
      expect(getAllowedRelations("NOTA", "TOPICO")).toEqual(["PERTENCE_A"]);
      expect(getAllowedRelations("NOTA", "ASSUNTO")).toEqual(["PERTENCE_A"]);
    });

    it("retorna vazio para pares sem regra", () => {
      expect(getAllowedRelations("NOTA", "NOTA")).toEqual([]);
      expect(getAllowedRelations("FLASHCARD", "FLASHCARD")).toEqual([]);
      expect(getAllowedRelations("FLASHCARD", "TOPICO")).toEqual([]);
      expect(getAllowedRelations("ASSUNTO", "ASSUNTO")).toEqual([]);
      expect(getAllowedRelations("ASSUNTO", "CONCEITO")).toEqual([]);
    });

    it("retorna vazio para tipos desconhecidos", () => {
      expect(getAllowedRelations("FOO", "CONCEITO")).toEqual([]);
    });
  });

  describe("canRelate", () => {
    it("true para pares com regra", () => {
      expect(canRelate("NOTA", "CONCEITO")).toBe(true);
      expect(canRelate("FLASHCARD", "CONCEITO")).toBe(true);
    });

    it("false para pares sem regra", () => {
      expect(canRelate("NOTA", "NOTA")).toBe(false);
      expect(canRelate("FLASHCARD", "ASSUNTO")).toBe(false);
    });
  });

  describe("isRelationAllowed", () => {
    it("aceita relação válida para o par", () => {
      expect(isRelationAllowed("NOTA", "CONCEITO", "DEFINE")).toBe(true);
      expect(isRelationAllowed("CONCEITO", "FLASHCARD", "HERDA")).toBe(true);
      expect(isRelationAllowed("TOPICO", "TOPICO", "EVOLUI_PARA")).toBe(true);
    });

    it("rejeita relação que pertence a outro par", () => {
      // DEFINE é de Nota↔Conceito, não de Conceito↔Conceito
      expect(isRelationAllowed("CONCEITO", "CONCEITO", "DEFINE")).toBe(false);
      // HERDA é de Flashcard↔Conceito
      expect(isRelationAllowed("CONCEITO", "CONCEITO", "HERDA")).toBe(false);
      // PERTENCE_A vale para Conceito↔Tópico e Tópico↔Assunto, não Conceito↔Conceito
      expect(isRelationAllowed("CONCEITO", "CONCEITO", "PERTENCE_A")).toBe(false);
    });

    it("rejeita qualquer relação para par sem regra", () => {
      expect(isRelationAllowed("FLASHCARD", "TOPICO", "HERDA")).toBe(false);
      // nota↔tópico só aceita PERTENCE_A
      expect(isRelationAllowed("NOTA", "TOPICO", "DEFINE")).toBe(false);
    });

    // Mutação: EVOLUI_PARA existe em dois pares distintos
    it("EVOLUI_PARA vale para Conceito↔Conceito e Tópico↔Tópico", () => {
      expect(isRelationAllowed("CONCEITO", "CONCEITO", "EVOLUI_PARA")).toBe(true);
      expect(isRelationAllowed("TOPICO", "TOPICO", "EVOLUI_PARA")).toBe(true);
      expect(isRelationAllowed("TOPICO", "ASSUNTO", "EVOLUI_PARA")).toBe(false);
    });
  });

  describe("getCanonicalDirection", () => {
    it("devolve [origem, destino] na ordem canônica, qualquer que seja a ordem dos args", () => {
      // par definido como CONCEITO → TOPICO (PERTENCE_A)
      expect(getCanonicalDirection("CONCEITO", "TOPICO", "PERTENCE_A")).toEqual(["CONCEITO", "TOPICO"]);
      expect(getCanonicalDirection("TOPICO", "CONCEITO", "PERTENCE_A")).toEqual(["CONCEITO", "TOPICO"]);
    });

    it("par NOTA → CONCEITO para DEFINE", () => {
      expect(getCanonicalDirection("CONCEITO", "NOTA", "DEFINE")).toEqual(["NOTA", "CONCEITO"]);
    });

    it("null para relação inválida no par", () => {
      expect(getCanonicalDirection("ASSUNTO", "CONCEITO", "PREREQUISITO")).toBeNull();
      expect(getCanonicalDirection("CONCEITO", "TOPICO", "DEPENDE_DE")).toBeNull();
    });
  });

  describe("getInsightTargets", () => {
    it("CONCEITO pode criar CONCEITO e TOPICO (não ASSUNTO)", () => {
      const tipos = getInsightTargets("CONCEITO").map((t) => t.tipo);
      expect(tipos).toContain("CONCEITO");
      expect(tipos).toContain("TOPICO");
      expect(tipos).not.toContain("ASSUNTO");
    });

    it("FLASHCARD só pode criar CONCEITO (HERDA + relações de Nota↔Conceito)", () => {
      const targets = getInsightTargets("FLASHCARD");
      expect(targets).toEqual([
        {
          tipo: "CONCEITO",
          relacoes: ["HERDA", "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO"],
        },
      ]);
    });

    it("ASSUNTO só pode criar TOPICO", () => {
      const tipos = getInsightTargets("ASSUNTO").map((t) => t.tipo);
      expect(tipos).toEqual(["TOPICO"]);
    });

    it("cada combo traz as relações permitidas daquele par", () => {
      const topico = getInsightTargets("CONCEITO").find((t) => t.tipo === "TOPICO");
      expect(topico?.relacoes).toEqual(["PERTENCE_A", "FUNDAMENTA", "APLICADO_EM"]);
    });
  });
});
