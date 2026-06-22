// Erros de domínio com contexto — incluem o valor ofensor (regra de engenharia).

export class NoActiveSessionError extends Error {
  constructor(userId: string) {
    super(`Nenhuma sessão de estudo ativa para o usuário "${userId}".`);
    this.name = 'NoActiveSessionError';
  }
}

export class CardNotFoundError extends Error {
  constructor(flashcardId: string) {
    super(`Flashcard não encontrado: "${flashcardId}".`);
    this.name = 'CardNotFoundError';
  }
}
