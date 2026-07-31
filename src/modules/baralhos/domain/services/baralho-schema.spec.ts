import { describe, it, expect } from "vitest";
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
});
