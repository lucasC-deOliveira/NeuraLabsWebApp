import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiError } from "./api";

// Ponte entre o 400 de validação do backend e o react-hook-form: o que tem campo
// vira erro de campo; o que sobra volta como texto para o chamador exibir.

const CONNECTION_MESSAGE = "Erro ao conectar. Tente novamente.";

/**
 * Marca no formulário os erros que o servidor associou a um campo.
 *
 * Só aplica em campos que o formulário realmente tem — um caminho desconhecido
 * viraria um erro fantasma, invisível (nenhum FormMessage escuta por ele).
 *
 * @returns a mensagem que sobrou para o banner, ou `null` se tudo virou erro de campo.
 * @example const banner = applyServerErrors(form, err);
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  if (!(error instanceof ApiError)) return CONNECTION_MESSAGE;

  // Roda dentro de um catch: um ApiError sem fieldErrors (mock, bundle antigo) não
  // pode derrubar o tratamento do erro original.
  const fieldErrors = error.fieldErrors ?? [];
  const known = new Set(Object.keys(form.getValues()));
  const orphans: string[] = [];
  for (const field of fieldErrors) {
    if (known.has(field.path)) form.setError(field.path as Path<T>, { type: "server", message: field.message });
    else orphans.push(field.message);
  }

  if (fieldErrors.length === 0) return error.message;
  return orphans.length > 0 ? orphans.join(", ") : null;
}
