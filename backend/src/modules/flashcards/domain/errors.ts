// Flashcards domain error (English, internal); mapped to PT in the interface.
export class NotaNotFoundError extends Error {
  constructor() {
    super('The note was not found.');
    this.name = 'NotaNotFoundError';
  }
}
