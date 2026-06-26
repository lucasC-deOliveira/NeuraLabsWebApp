// Domain errors with context — include the offending value (engineering rule).

export class NoActiveSessionError extends Error {
  constructor(userId: string) {
    super(`No active study session for user "${userId}".`);
    this.name = 'NoActiveSessionError';
  }
}

export class CardNotFoundError extends Error {
  constructor(flashcardId: string) {
    super(`Flashcard not found: "${flashcardId}".`);
    this.name = 'CardNotFoundError';
  }
}
