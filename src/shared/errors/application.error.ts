export class ApplicationError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'ApplicationError'
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor() {
    super('Email ou senha incorretos', 'UNAUTHORIZED')
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT')
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'VALIDATION')
  }
}

export class TooManyRequestsError extends ApplicationError {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      `Muitas tentativas. Tente novamente em ${retryAfterSeconds} segundos.`,
      'TOO_MANY_REQUESTS',
    )
  }
}
