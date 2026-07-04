import { describe, it, expect } from "vitest";
import { validateProvaDraft } from "./prova-form";

describe("validateProvaDraft", () => {
  it("accepts a titled draft with at least one question", () => {
    expect(validateProvaDraft("Prova de Bio", 3)).toBeNull();
  });

  it("requires a title", () => {
    expect(validateProvaDraft("", 3)).toBe("Informe o título da prova.");
    expect(validateProvaDraft("   ", 3)).toBe("Informe o título da prova.");
  });

  it("requires at least one question", () => {
    expect(validateProvaDraft("Prova de Bio", 0)).toBe("Adicione ao menos uma questão.");
  });
});
