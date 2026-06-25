// Questions domain errors (English, internal). The interface layer maps them to
// user-facing (Portuguese) HTTP responses.

export class QuestaoNotFoundError extends Error {
  constructor() {
    super('The questao was not found.');
    this.name = 'QuestaoNotFoundError';
  }
}

export class QuestaoForbiddenError extends Error {
  constructor() {
    super('The questao belongs to another user.');
    this.name = 'QuestaoForbiddenError';
  }
}

// Asserts the loaded questao exists and belongs to the user, else throws.
export function assertOwner<T extends { usuarioId: string }>(
  questao: T | null,
  userId: string,
): asserts questao is T {
  if (!questao) throw new QuestaoNotFoundError();
  if (questao.usuarioId !== userId) throw new QuestaoForbiddenError();
}
