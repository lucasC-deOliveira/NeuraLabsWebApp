import type { ZodError } from 'zod';

// Formato estável do 400 de validação. O cliente precisa saber QUAL campo falhou
// para marcar o formulário — o padrão do Nest achata tudo em string[], sem caminho
// legível por máquina.
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

/**
 * Corpo do 400 de validação, a partir dos erros já associados aos campos.
 *
 * @example validationErrorBody([{ path: 'email', message: 'Informe um email válido' }])
 */
export function validationErrorBody(fields: FieldError[]): ValidationErrorBody {
  return {
    statusCode: 400,
    error: 'Bad Request',
    message: fields.map((field) => field.message),
    errors: fields,
  };
}

/** Traduz as issues do zod em pares caminho/mensagem (`endereco.cidade`). */
export function zodFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
