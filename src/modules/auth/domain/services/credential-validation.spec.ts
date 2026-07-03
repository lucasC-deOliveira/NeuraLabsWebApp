import { describe, it, expect } from "vitest";
import { validateRegistration, safeCallbackUrl } from "./credential-validation";

describe("validateRegistration", () => {
  it("accepts a well-formed registration", () => {
    expect(validateRegistration("Ada", "a@b.com", "secret", "secret")).toBeNull();
  });

  it("rejects missing fields", () => {
    expect(validateRegistration("", "a@b.com", "secret", "secret")).toBe("Preencha todos os campos");
    expect(validateRegistration("Ada", "   ", "secret", "secret")).toBe("Preencha todos os campos");
    expect(validateRegistration("Ada", "a@b.com", "", "")).toBe("Preencha todos os campos");
  });

  it("rejects mismatched passwords", () => {
    expect(validateRegistration("Ada", "a@b.com", "secret", "other")).toBe("As senhas nao coincidem");
  });

  it("rejects passwords shorter than 6 chars", () => {
    expect(validateRegistration("Ada", "a@b.com", "abc", "abc")).toBe("Senha deve ter no minimo 6 caracteres");
  });
});

describe("safeCallbackUrl", () => {
  it("keeps same-origin absolute paths", () => {
    expect(safeCallbackUrl("/graph/1")).toBe("/graph/1");
  });

  it("rejects protocol-relative and absolute URLs (open redirect)", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/");
    expect(safeCallbackUrl("https://evil.com")).toBe("/");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/");
  });
});
