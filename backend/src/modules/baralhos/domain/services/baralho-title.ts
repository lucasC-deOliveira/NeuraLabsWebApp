import { InvalidBaralhoTitleError } from '../errors';

const MAX_TITLE_LENGTH = 120;

/**
 * Normaliza o título de um baralho, recusando vazio/branco ou longo demais.
 * @example normalizeBaralhoTitle('  Biologia  ') // 'Biologia'
 */
export function normalizeBaralhoTitle(titulo: string): string {
  const trimmed = String(titulo ?? '').trim();
  if (!trimmed || trimmed.length > MAX_TITLE_LENGTH) throw new InvalidBaralhoTitleError(titulo);
  return trimmed;
}
