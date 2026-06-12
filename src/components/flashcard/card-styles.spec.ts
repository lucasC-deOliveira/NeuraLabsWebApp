import { describe, it, expect } from "vitest";
import {
  CARD_STYLES,
  getCardStyle,
  getActiveCardCss,
  type CardStyleId,
} from "./card-styles";

describe("card-styles", () => {
  it("tem os presets esperados, incluindo classic e custom", () => {
    const ids = CARD_STYLES.map((s) => s.id);
    expect(ids).toContain("classic");
    expect(ids).toContain("custom");
    expect(new Set(ids).size).toBe(ids.length); // ids únicos
  });

  it("getCardStyle devolve o estilo pelo id e cai no classic se inválido", () => {
    expect(getCardStyle("neon").id).toBe("neon");
    expect(getCardStyle("xpto" as CardStyleId).id).toBe("classic");
  });

  it("classic não injeta CSS (usa o visual padrão do tema)", () => {
    expect(getActiveCardCss("classic", "qualquer")).toBe("");
  });

  it("presets usam o CSS do preset, ignorando o custom", () => {
    expect(getActiveCardCss("dark", ".x{}")).toBe(getCardStyle("dark").css);
    expect(getActiveCardCss("dark", ".x{}")).not.toBe(".x{}");
  });

  it("custom usa o CSS fornecido pelo usuário", () => {
    expect(getActiveCardCss("custom", ".fc-card{color:red}")).toBe(".fc-card{color:red}");
  });

  it("presets visuais miram as classes .fc-*", () => {
    for (const id of ["dark", "neon", "paper"] as CardStyleId[]) {
      const css = getCardStyle(id).css;
      expect(css).toContain(".fc-pergunta");
      expect(css).toContain(".fc-resposta");
    }
  });
});
