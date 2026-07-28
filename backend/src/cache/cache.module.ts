import { Global, Module } from '@nestjs/common';
import { CACHE_PORT } from '../modules/cache/domain/cache-port';
import { InMemoryCache } from '../modules/cache/infrastructure/in-memory-cache';

// Cache in-memory global: qualquer módulo injeta CACHE_PORT sem importar este módulo.
// Adapter único por processo (a fila LRU e as tags vivem numa instância só).
@Global()
@Module({
  providers: [{ provide: CACHE_PORT, useFactory: () => new InMemoryCache() }],
  exports: [CACHE_PORT],
})
export class CacheModule {}
