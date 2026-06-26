// Auth domain errors (English, internal). The interface layer maps them to
// user-facing (Portuguese) HTTP responses.

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('An account already exists for this email.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('The email or password is incorrect.');
    this.name = 'InvalidCredentialsError';
  }
}
