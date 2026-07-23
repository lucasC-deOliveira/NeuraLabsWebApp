// Provas domain errors (English, internal). The interface layer maps them to
// user-facing (Portuguese) HTTP responses.

export class ProvaNotFoundError extends Error {
  constructor() {
    super('The prova was not found.');
    this.name = 'ProvaNotFoundError';
  }
}

export class ProvaForbiddenError extends Error {
  constructor() {
    super('The prova belongs to another user.');
    this.name = 'ProvaForbiddenError';
  }
}

// Raised when an uploaded document has an extension/mime we cannot extract text
// from. Carries the offending extension and the accepted formats.
export class UnsupportedDocumentFormatError extends Error {
  constructor(readonly ext: string) {
    super(`Unsupported document format: "${ext}". Expected: pdf|docx|txt`);
    this.name = 'UnsupportedDocumentFormatError';
  }
}

// Raised when the LLM returns something that is not parseable exam JSON.
export class InvalidExamJsonError extends Error {
  constructor() {
    super('The LLM returned an unparseable exam JSON payload.');
    this.name = 'InvalidExamJsonError';
  }
}

// Raised when linking would break the 1:1 edital↔prova relationship.
export class ProvaAlreadyHasEditalError extends Error {
  constructor() {
    super('The prova is already linked to an edital.');
    this.name = 'ProvaAlreadyHasEditalError';
  }
}

export class EditalAlreadyLinkedError extends Error {
  constructor() {
    super('The edital is already linked to a prova.');
    this.name = 'EditalAlreadyLinkedError';
  }
}

// Raised when a quiz attempt is submitted with no answers.
export class EmptyAttemptError extends Error {
  constructor(offending: number) {
    super(`A quiz attempt needs at least one answer, got ${offending}.`);
    this.name = 'EmptyAttemptError';
  }
}

// Asserts the loaded prova exists and belongs to the user, else throws.
export function assertOwner<T extends { usuarioId: string }>(
  prova: T | null,
  userId: string,
): asserts prova is T {
  if (!prova) throw new ProvaNotFoundError();
  if (prova.usuarioId !== userId) throw new ProvaForbiddenError();
}
