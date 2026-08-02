import { BadRequestException, Body } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { validationErrorBody, zodFieldErrors } from './validation-error';

// Valida o corpo da requisição contra o contrato compartilhado (contracts/).
// Decorator explícito no lugar de um pipe global sobre metadata: o schema fica
// visível na assinatura da rota, e não há reflexão de tipo envolvida.

class ZodBodyPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;
    throw new BadRequestException(validationErrorBody(zodFieldErrors(parsed.error)));
  }
}

/**
 * Corpo validado pelo contrato. O parâmetro recebe o valor JÁ parseado (com trim
 * e defaults aplicados), então a rota não precisa repetir `?? ''`.
 *
 * @example create(@ZodBody(createBaralhoContract) body: CreateBaralhoBody) {}
 */
export function ZodBody<T>(schema: ZodType<T>): ParameterDecorator {
  return Body(new ZodBodyPipe(schema));
}
