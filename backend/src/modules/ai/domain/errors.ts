// AI domain errors with context — the interface layer maps them to user-facing
// (Portuguese) HTTP responses.

export class InvalidAiJsonError extends Error {
  constructor() {
    super('The AI returned a response that is not valid JSON.');
    this.name = 'InvalidAiJsonError';
  }
}
