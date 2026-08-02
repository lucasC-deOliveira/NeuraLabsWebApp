import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validationErrorBody, zodFieldErrors } from './validation-error';

describe('zodFieldErrors', () => {
  it('pairs each issue with its field', () => {
    const schema = z.object({ email: z.string().email('Informe um email válido') });
    const parsed = schema.safeParse({ email: 'x' });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodFieldErrors(parsed.error)).toEqual([
      { path: 'email', message: 'Informe um email válido' },
    ]);
  });

  it('reports every failing field, not just the first', () => {
    const schema = z.object({
      nome: z.string().min(1, 'Informe seu nome'),
      email: z.string().email('Informe um email válido'),
    });
    const parsed = schema.safeParse({ nome: '', email: 'x' });

    if (parsed.success) throw new Error('esperava falha');
    expect(zodFieldErrors(parsed.error).map((f) => f.path)).toEqual(['nome', 'email']);
  });

  it('dots the path of a nested field', () => {
    const schema = z.object({
      endereco: z.object({ cidade: z.string().min(1, 'Informe a cidade') }),
    });
    const parsed = schema.safeParse({ endereco: { cidade: '' } });

    if (parsed.success) throw new Error('esperava falha');
    expect(zodFieldErrors(parsed.error)[0].path).toBe('endereco.cidade');
  });
});

describe('validationErrorBody', () => {
  it('monta o 400 mantendo message como string[] e o erro por campo', () => {
    const fields = [{ path: 'email', message: 'Informe um email válido' }];

    expect(validationErrorBody(fields)).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Informe um email válido'],
      errors: fields,
    });
  });
});
