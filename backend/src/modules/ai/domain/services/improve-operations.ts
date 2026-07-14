// Operações de melhoria por IA compartilhadas por flashcards e questões. O usuário
// escolhe quais aplicar; só as instruções das escolhidas vão ao prompt (economia).

export type ImproveOperation = 'format' | 'markdown' | 'content';

export const VALID_OPERATIONS: ImproveOperation[] = ['format', 'markdown', 'content'];

/** Filtra operações válidas e remove duplicatas; lança se nenhuma sobrar. */
export function normalizeOperations(operations: unknown): ImproveOperation[] {
  const list = Array.isArray(operations) ? operations : [];
  const valid = VALID_OPERATIONS.filter((op) => list.includes(op));
  if (valid.length === 0) {
    throw new Error(
      `no valid improve operations: ${JSON.stringify(operations)}. Expected any of: format|markdown|content`,
    );
  }
  return valid;
}
