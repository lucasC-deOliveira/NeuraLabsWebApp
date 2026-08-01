import { describe, it, expect } from 'vitest';
import type { ValidationError } from '@nestjs/common';
import { toFieldErrors, validationExceptionFactory } from './validation-error';

function error(property: string, constraints: Record<string, string>, children: ValidationError[] = []): ValidationError {
  return { property, constraints, children } as ValidationError;
}

describe('toFieldErrors', () => {
  it('pairs each constraint with its field', () => {
    expect(toFieldErrors([error('email', { isEmail: 'Informe um email válido' })])).toEqual([
      { path: 'email', message: 'Informe um email válido' },
    ]);
  });

  it('keeps every constraint of the same field', () => {
    const errors = toFieldErrors([error('senha', { isString: 'Texto', minLength: 'Mínimo 6' })]);
    expect(errors.map((e) => e.message)).toEqual(['Texto', 'Mínimo 6']);
    expect(errors.every((e) => e.path === 'senha')).toBe(true);
  });

  it('dots the path of a nested field', () => {
    const nested = error('endereco', {}, [error('cidade', { isString: 'Informe a cidade' })]);
    expect(toFieldErrors([nested])).toEqual([{ path: 'endereco.cidade', message: 'Informe a cidade' }]);
  });

  it('survives an error with neither constraints nor children', () => {
    expect(toFieldErrors([{ property: 'x' } as ValidationError])).toEqual([]);
  });
});

describe('validationExceptionFactory', () => {
  it('answers 400 with the field errors and keeps message as string[]', () => {
    const exception = validationExceptionFactory([error('email', { isEmail: 'Informe um email válido' })]);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Informe um email válido'],
      errors: [{ path: 'email', message: 'Informe um email válido' }],
    });
  });
});
