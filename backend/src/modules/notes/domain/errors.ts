// Notes domain error (English, internal); the interface maps it to a PT response.
export class NotaNotFoundError extends Error {
  constructor() {
    super('The note was not found.');
    this.name = 'NotaNotFoundError';
  }
}
