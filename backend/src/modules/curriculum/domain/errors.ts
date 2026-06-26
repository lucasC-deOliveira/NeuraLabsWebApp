// Curriculum domain errors (English, internal); mapped to PT in the interface.
export class AssuntoNotFoundError extends Error {
  constructor() {
    super('The subject was not found.');
    this.name = 'AssuntoNotFoundError';
  }
}

export class TopicoNotFoundError extends Error {
  constructor() {
    super('The topic was not found.');
    this.name = 'TopicoNotFoundError';
  }
}
