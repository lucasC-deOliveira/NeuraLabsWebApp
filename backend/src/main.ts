import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // todas as rotas sob /api
  app.setGlobalPrefix('api');

  // valida e remove campos não declarados nos DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS para o frontend (Next). Origem configurável; * em dev.
  const origin = process.env.FRONTEND_ORIGIN?.split(',').map((s) => s.trim()) ?? true;
  app.enableCors({ origin, credentials: true });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ouvindo em http://0.0.0.0:${port}/api`);
}

void bootstrap();
