import { describe, it, expect } from "vitest";
import { BARALHO_TITULO_MAX } from "@contracts/baralhos";
import { baralhoSchema } from "./baralho-schema";

describe("baralhoSchema", () => {
  it("accepts a non-empty title and trims it", () => {
    const r = baralhoSchema.safeParse({ titulo: "  Biologia  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.titulo).toBe("Biologia");
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(baralhoSchema.safeParse({ titulo: "" }).success).toBe(false);
    const r = baralhoSchema.safeParse({ titulo: "   " });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Informe o título do baralho");
  });

  // Antes o form só exigia min(1) e o teto do servidor virava um 400 depois do
  // submit — o usuário perdia o erro de campo.
  it("rejects a title past the limit the server enforces", () => {
    const r = baralhoSchema.safeParse({ titulo: "x".repeat(BARALHO_TITULO_MAX + 1) });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain(String(BARALHO_TITULO_MAX));
  });

  it("accepts a title at exactly the limit", () => {
    expect(baralhoSchema.safeParse({ titulo: "x".repeat(BARALHO_TITULO_MAX) }).success).toBe(true);
  });
});
