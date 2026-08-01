import { describe, it, expect, vi } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import { ApiError } from "./api";
import { applyServerErrors } from "./form-errors";

interface Credentials extends Record<string, string> {
  email: string;
  senha: string;
}

/** Minimal stand-in for the form: applyServerErrors only reads values and sets errors. */
function fakeForm(values: Credentials = { email: "", senha: "" }) {
  const setError = vi.fn();
  const form = { getValues: () => values, setError } as unknown as UseFormReturn<Credentials>;
  return { form, setError };
}

describe("applyServerErrors", () => {
  it("marks the field the server pointed at", () => {
    const { form, setError } = fakeForm();
    const error = new ApiError(400, "Informe um email válido", [
      { path: "email", message: "Informe um email válido" },
    ]);

    expect(applyServerErrors(form, error)).toBeNull();
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "Informe um email válido" });
  });

  it("marks every field of a multi-field rejection", () => {
    const { form, setError } = fakeForm();
    const error = new ApiError(400, "x", [
      { path: "email", message: "Informe um email válido" },
      { path: "senha", message: "A senha precisa de pelo menos 6 caracteres" },
    ]);

    expect(applyServerErrors(form, error)).toBeNull();
    expect(setError).toHaveBeenCalledTimes(2);
  });

  it("returns the message for an error with no field, leaving the form alone", () => {
    const { form, setError } = fakeForm();

    expect(applyServerErrors(form, new ApiError(401, "Email ou senha incorretos"))).toBe("Email ou senha incorretos");
    expect(setError).not.toHaveBeenCalled();
  });

  it("does not invent an error on a field the form does not have", () => {
    const { form, setError } = fakeForm();
    const error = new ApiError(400, "x", [{ path: "cpf", message: "CPF inválido" }]);

    // Um erro fantasma seria invisível: nenhum FormMessage escuta por "cpf".
    expect(applyServerErrors(form, error)).toBe("CPF inválido");
    expect(setError).not.toHaveBeenCalled();
  });

  it("splits known fields from orphans", () => {
    const { form, setError } = fakeForm();
    const error = new ApiError(400, "x", [
      { path: "email", message: "Informe um email válido" },
      { path: "cpf", message: "CPF inválido" },
    ]);

    expect(applyServerErrors(form, error)).toBe("CPF inválido");
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "Informe um email válido" });
  });

  it("falls back to the connection message for anything that is not an ApiError", () => {
    const { form } = fakeForm();
    expect(applyServerErrors(form, new TypeError("fetch failed"))).toBe("Erro ao conectar. Tente novamente.");
  });

  it("survives an ApiError whose fieldErrors is missing", () => {
    const { form } = fakeForm();
    const legacy = new ApiError(500, "boom");
    (legacy as { fieldErrors?: unknown }).fieldErrors = undefined;

    expect(applyServerErrors(form, legacy)).toBe("boom");
  });
});
