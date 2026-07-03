// Pure validation for the "new prova" flows (manual selection and file import).

/**
 * Validates a prova draft before create. Returns a user-facing (pt-BR) error, or
 * `null` when it can be saved. Both flows need a title and at least one question.
 *
 * @example
 * validateProvaDraft("Bio", 3);  // → null
 * validateProvaDraft("", 3);     // → "Informe o título da prova."
 * validateProvaDraft("Bio", 0);  // → "Adicione ao menos uma questão."
 */
export function validateProvaDraft(titulo: string, questaoCount: number): string | null {
  if (!titulo.trim()) return "Informe o título da prova.";
  if (questaoCount === 0) return "Adicione ao menos uma questão.";
  return null;
}
