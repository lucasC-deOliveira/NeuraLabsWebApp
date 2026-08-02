import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // As figuras extraídas das provas viajam base64 no JSON de criação (from-parsed),
  // então o corpo pode passar do padrão de 100kb.
  app.useBodyParser('json', { limit: '30mb' });

  // todas as rotas sob /api
  app.setGlobalPrefix('api');

  // Sem pipe global: a validação é explícita por rota, via @ZodBody(contrato).
  // Ver src/common/zod-body.decorator.ts.

  // CORS para o frontend (Next). Origem configurável; * em dev.
  const origin = process.env.FRONTEND_ORIGIN?.split(',').map((s) => s.trim()) ?? true;
  app.enableCors({ origin, credentials: true });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ouvindo em http://0.0.0.0:${port}/api`);
}

void bootstrap();
