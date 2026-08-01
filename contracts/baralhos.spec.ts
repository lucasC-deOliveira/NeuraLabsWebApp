import { describe, it, expect } from "vitest";
import {
  BARALHO_TITULO_MAX,
  createBaralhoContract,
  renameBaralhoContract,
  addCardsToBaralhoContract,
} from "@contracts/baralhos";

// Roda pelo vitest do frontend, então também prova que o alias @contracts resolve.
// A resolução do backend (import relativo + rootDir "..") é provada pelo build:
// `node -e "require('./dist/contracts/baralhos.js')"`.

describe("createBaralhoContract", () => {
  it("exige o título", () => {
    const parsed = createBaralhoContract.safeParse({ titulo: "  " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("Informe o título do baralho");
  });

  it("recusa acima do teto do servidor", () => {
    const parsed = createBaralhoContract.safeParse({ titulo: "x".repeat(BARALHO_TITULO_MAX + 1) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(["titulo"]);
  });

  it("aceita exatamente o teto", () => {
    expect(createBaralhoContract.safeParse({ titulo: "x".repeat(BARALHO_TITULO_MAX) }).success).toBe(true);
  });

  it("apara o título e assume lista vazia de cards", () => {
    const parsed = createBaralhoContract.parse({ titulo: "  Bio  " });
    expect(parsed).toEqual({ titulo: "Bio", flashcardIds: [] });
  });
});

describe("renameBaralhoContract / addCardsToBaralhoContract", () => {
  it("aplicam a mesma regra de título do create", () => {
    expect(renameBaralhoContract.safeParse({ titulo: "" }).success).toBe(false);
    expect(renameBaralhoContract.safeParse({ titulo: "Bio" }).success).toBe(true);
  });

  it("aceitam adicionar cards sem lista", () => {
    expect(addCardsToBaralhoContract.parse({})).toEqual({ flashcardIds: [] });
  });
});
