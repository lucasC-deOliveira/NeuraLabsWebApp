import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { validationExceptionFactory } from './common/validation-error';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // As figuras extraídas das provas viajam base64 no JSON de criação (from-parsed),
  // então o corpo pode passar do padrão de 100kb.
  app.useBodyParser('json', { limit: '30mb' });

  // todas as rotas sob /api
  app.setGlobalPrefix('api');

  // valida os DTOs decorados (auth) e converte tipos. A exceptionFactory devolve
  // o erro POR CAMPO — sem ela o Nest achata tudo em string[] e o cliente não tem
  // como marcar o campo certo no formulário.
  app.useGlobalPipes(new ValidationPipe({ transform: true, exceptionFactory: validationExceptionFactory }));

  // CORS para o frontend (Next). Origem configurável; * em dev.
  const origin = process.env.FRONTEND_ORIGIN?.split(',').map((s) => s.trim()) ?? true;
  app.enableCors({ origin, credentials: true });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ouvindo em http://0.0.0.0:${port}/api`);
}

void bootstrap();
