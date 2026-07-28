// A borda de cache do frontend: um mecanismo único (localStorage + camada em
// memória) que substitui os caches ad-hoc por módulo. Um "slot" amarra chave +
// versão + TTL + tags + reviver de datas; o store faz a invalidação por tag.
// Espelha o CachePort do backend, adaptado ao cliente (leitura síncrona para
// pintar a tela na hora; stale-while-revalidate feito pelo consumidor).

// Um slot de cache tipado: a unidade que um módulo lê/escreve/invalida.
export interface CacheSlot<T> {
  // Último payload válido, ou null em miss/expirado/corrompido (nunca lança).
  read(): T | null;
  write(value: T): void;
  invalidate(): void;
}

// Definição de um slot. A versão entra na chave de armazenamento: mudar o
// formato do payload é bumpar a versão — o payload antigo vira miss, não quebra.
export interface SlotDef<T> {
  key: string;
  version: number;
  // Expiração dura opcional. Sem TTL, o slot serve o cache sempre (SWR puro:
  // o consumidor revalida em segundo plano e regrava).
  ttlMs?: number;
  // Tags para invalidação em grupo (ex.: 'baralhos'): uma mutação limpa todos
  // os slots da tag de uma vez.
  tags?: readonly string[];
  // O cache é uma fronteira não confiável: o disco pode ter um payload de uma
  // versão anterior. `accept` confere a forma antes de servir — um payload
  // defasado vira miss (cache vazio) em vez de quebrar a tela. Roda antes do revive.
  accept?: (raw: T) => boolean;
  // JSON serializa Date como string; o reviver reconstrói os campos Date na leitura.
  revive?: (raw: T) => T;
}

// O mecanismo de cache. Cria slots e invalida por tag.
export interface CacheStore {
  slot<T>(def: SlotDef<T>): CacheSlot<T>;
  invalidateTag(tag: string): void;
}
