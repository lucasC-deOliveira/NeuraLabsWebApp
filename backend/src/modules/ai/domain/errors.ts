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
