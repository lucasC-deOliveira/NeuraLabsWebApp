import { Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { ZodBody } from './zod-body.decorator';

// App Nest mínimo, sem banco: valida o decorator e o FORMATO do 400 sobre HTTP de
// verdade. O contrato desse formato é lido pelo frontend em src/lib/api.ts.

const schema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título'),
  tags: z.array(z.string()).default([]),
});

@Controller('echo')
class EchoController {
  @Post()
  echo(@ZodBody(schema) body: z.infer<typeof schema>): z.infer<typeof schema> {
    return body;
  }
}

describe('@ZodBody', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [EchoController] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('entrega o corpo já parseado: com trim e defaults aplicados', async () => {
    const res = await request(app.getHttpServer()).post('/echo').send({ titulo: '  Bio  ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ titulo: 'Bio', tags: [] });
  });

  it('responde 400 no formato que o cliente sabe ler', async () => {
    const res = await request(app.getHttpServer()).post('/echo').send({ titulo: '  ' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Informe o título'],
      errors: [{ path: 'titulo', message: 'Informe o título' }],
    });
  });

  it('recusa um corpo de outro formato em vez de deixar passar', async () => {
    const res = await request(app.getHttpServer()).post('/echo').send({ tags: 'nao-e-lista' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual(['tags', 'titulo']);
  });
});
