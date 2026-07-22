// Domain errors with context — include the offending value (engineering rule).

export class EmptySpeechTextError extends Error {
  constructor(offending: string) {
    super(`Speech text is empty: "${offending}". Expected: a non-empty string.`);
    this.name = 'EmptySpeechTextError';
  }
}
