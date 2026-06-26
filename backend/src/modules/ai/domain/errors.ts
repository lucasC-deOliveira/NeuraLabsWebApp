// AI domain errors with context — the interface layer maps them to user-facing
// (Portuguese) HTTP responses.

export class InvalidAiJsonError extends Error {
  constructor() {
    super('The AI returned a response that is not valid JSON.');
    this.name = 'InvalidAiJsonError';
  }
}

export class AiNodeNotFoundError extends Error {
  constructor() {
    super('The target node was not found in the graph.');
    this.name = 'AiNodeNotFoundError';
  }
}

export class EmptyNodeListError extends Error {
  constructor() {
    super('The node list is empty.');
    this.name = 'EmptyNodeListError';
  }
}

export class EmptyClusterContentError extends Error {
  constructor() {
    super('The cluster nodes have no content to summarize.');
    this.name = 'EmptyClusterContentError';
  }
}

export class UnsupportedExpandTypeError extends Error {
  constructor(readonly tipo: string) {
    super(`Node type "${tipo}" cannot be expanded. Expected: ASSUNTO|TOPICO|CONCEITO|NOTA`);
    this.name = 'UnsupportedExpandTypeError';
  }
}

export class EmptyAiContentError extends Error {
  constructor() {
    super('The AI returned no content.');
    this.name = 'EmptyAiContentError';
  }
}

export class MergeKeepNotFoundError extends Error {
  constructor() {
    super('The node to keep was not found in the graph.');
    this.name = 'MergeKeepNotFoundError';
  }
}

export class NoteNotFoundError extends Error {
  constructor() {
    super('The note was not found.');
    this.name = 'NoteNotFoundError';
  }
}

export class GraphNotFoundError extends Error {
  constructor() {
    super('The graph was not found.');
    this.name = 'GraphNotFoundError';
  }
}

export class BaralhoNotFoundError extends Error {
  constructor() {
    super('The deck was not found.');
    this.name = 'BaralhoNotFoundError';
  }
}

export class EmptyBaralhoError extends Error {
  constructor() {
    super('The deck has no flashcards.');
    this.name = 'EmptyBaralhoError';
  }
}

export class EmptyTextError extends Error {
  constructor() {
    super('The text cannot be empty.');
    this.name = 'EmptyTextError';
  }
}
