import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';

// Formato estável do 400 de validação. O cliente precisa saber QUAL campo falhou
// para marcar o formulário — o padrão do NestJS achata tudo em string[] ("email
// must be an email"), sem caminho legível por máquina.
//
// `message` continua sendo string[] por compatibilidade: quem só exibe texto não muda.
export interface FieldError {
  path: string;
  message: string;
}

export interface ValidationErrorBody {
  statusCode: number;
  error: string;
  message: string[];
  errors: FieldError[];
}

/** Caminho do campo aninhado: `endereco` + `cidade` => `endereco.cidade`. */
function joinPath(parent: string, property: string): string {
  return parent ? `${parent}.${property}` : property;
}

/** Achata a árvore do class-validator em pares caminho/mensagem. */
export function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error): FieldError[] => {
    const path = joinPath(parent, error.property);
    const own = Object.values(error.constraints ?? {}).map((message): FieldError => ({ path, message }));
    return [...own, ...toFieldErrors(error.children ?? [], path)];
  });
}

/**
 * Fábrica do 400 de validação, ligada ao ValidationPipe global em main.ts.
 *
 * @example new ValidationPipe({ exceptionFactory: validationExceptionFactory })
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fields = toFieldErrors(errors);
  const body: ValidationErrorBody = {
    statusCode: 400,
    error: 'Bad Request',
    message: fields.map((field) => field.message),
    errors: fields,
  };
  return new BadRequestException(body);
}
