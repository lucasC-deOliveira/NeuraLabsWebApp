import { describe, it, expect } from "vitest";
import {
  MANUAL_CARD_SCHEMAS, EMPTY_MANUAL_FORM_VALUES, toManualCardFields,
  type ManualCardFormValues,
} from "./manual-card-schema";
import type { ManualCardType } from "../manual-card";

function values(over: Partial<ManualCardFormValues>): ManualCardFormValues {
  return { ...EMPTY_MANUAL_FORM_VALUES, ...over };
}

/** Field paths that failed validation, e.g. ["pergunta", "resposta"]. */
function invalidPaths(tipo: ManualCardType, over: Partial<ManualCardFormValues>): string[] {
  const result = MANUAL_CARD_SCHEMAS[tipo].safeParse(values(over));
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("MANUAL_CARD_SCHEMAS", () => {
  it("rejects an empty form for every card type", () => {
    for (const tipo of Object.keys(MANUAL_CARD_SCHEMAS) as ManualCardType[]) {
      expect(invalidPaths(tipo, {}), `${tipo} should reject empty fields`).not.toEqual([]);
    }
  });

  it("requires pergunta and resposta on DEFINICAO", () => {
    expect(invalidPaths("DEFINICAO", {})).toEqual(["pergunta", "resposta"]);
    expect(invalidPaths("DEFINICAO", { pergunta: "Soberania", resposta: "poder supremo" })).toEqual([]);
  });

  it("ignores fields that do not belong to the selected type", () => {
    // frase/lacuna are COMPLETAR-only; leaving them empty must not block DEFINICAO.
    expect(invalidPaths("DEFINICAO", { pergunta: "a", resposta: "b", frase: "", lacuna: "" })).toEqual([]);
  });

  it("points CONTRASTE at whichever concept is missing", () => {
    expect(invalidPaths("CONTRASTE", { conceitoB: "B", explicacaoComp: "diff" })).toEqual(["conceitoA"]);
    expect(invalidPaths("CONTRASTE", { conceitoA: "A", explicacaoComp: "diff" })).toEqual(["conceitoB"]);
  });

  it("requires both sides of ERRO_COMUM", () => {
    expect(invalidPaths("ERRO_COMUM", { temaErro: "X", erro: "e1" })).toEqual(["correto"]);
    expect(invalidPaths("ERRO_COMUM", { temaErro: "X", erro: "e1", correto: "c1" })).toEqual([]);
  });

  it("requires APLICACAO to use cenario/explicacaoApp, not pergunta/resposta", () => {
    expect(invalidPaths("APLICACAO", { pergunta: "a", resposta: "b" })).toEqual(["cenario", "explicacaoApp"]);
    expect(invalidPaths("APLICACAO", { cenario: "c", explicacaoApp: "e" })).toEqual([]);
  });

  it("accepts ORDENACAO when at least one item has text", () => {
    expect(invalidPaths("ORDENACAO", { temaLista: "passos" })).toEqual(["itens"]);
    expect(invalidPaths("ORDENACAO", { temaLista: "passos", itens: [{ value: "  " }] })).toEqual(["itens"]);
    expect(invalidPaths("ORDENACAO", { temaLista: "passos", itens: [{ value: "a" }] })).toEqual([]);
  });

  it("treats whitespace-only text as missing", () => {
    expect(invalidPaths("DEFINICAO", { pergunta: "   ", resposta: "   " })).toEqual(["pergunta", "resposta"]);
  });

  it("carries a user-facing message on every failure", () => {
    const parsed = MANUAL_CARD_SCHEMAS.DEFINICAO.safeParse(EMPTY_MANUAL_FORM_VALUES);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    for (const issue of parsed.error.issues) expect(issue.message.length).toBeGreaterThan(0);
  });
});

describe("toManualCardFields", () => {
  it("flattens the useFieldArray items back to the domain string[]", () => {
    const flat = toManualCardFields(values({ temaLista: "passos", itens: [{ value: "a" }, { value: "" }, { value: "b" }] }));
    expect(flat.itens).toEqual(["a", "", "b"]);
  });

  it("keeps every other field untouched", () => {
    expect(toManualCardFields(values({ pergunta: "p", resposta: "r" }))).toMatchObject({ pergunta: "p", resposta: "r" });
  });

  it("fills the gaps of a half-typed draft, as the live preview sees it", () => {
    const flat = toManualCardFields({ pergunta: "Soberania" });
    expect(flat.pergunta).toBe("Soberania");
    expect(flat.resposta).toBe("");
    expect(flat.itens).toEqual(["", "", ""]);
  });

  it("survives holes inside the items array", () => {
    expect(toManualCardFields({ itens: [{ value: "a" }, undefined, {}] }).itens).toEqual(["a", "", ""]);
  });
});

describe("EMPTY_MANUAL_FORM_VALUES", () => {
  it("starts with three blank ordering slots, mirroring the domain default", () => {
    expect(EMPTY_MANUAL_FORM_VALUES.itens).toEqual([{ value: "" }, { value: "" }, { value: "" }]);
  });
});
