import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "./auth-schemas";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", senha: "x" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const r = loginSchema.safeParse({ email: "nope", senha: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Email invalido");
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", senha: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = { nome: "Ada", email: "a@b.com", senha: "secret", senhaConfirm: "secret" };

  it("accepts a well-formed registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords with a message on senhaConfirm", () => {
    const r = registerSchema.safeParse({ ...base, senhaConfirm: "other" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("As senhas nao coincidem");
      expect(r.error.issues[0].path).toEqual(["senhaConfirm"]);
    }
  });

  it("rejects passwords shorter than 6 chars", () => {
    const r = registerSchema.safeParse({ ...base, senha: "abc", senhaConfirm: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Senha deve ter no minimo 6 caracteres");
  });

  it("rejects an empty name", () => {
    expect(registerSchema.safeParse({ ...base, nome: "  " }).success).toBe(false);
  });
});
