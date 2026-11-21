import { normalizeImportedBaralhos } from '../../../../../../contracts/baralho-import';
import { EmptyImportError } from '../errors';
import type { ImportedBaralho } from '../baralho-views';

// O JSON importado pode vir do export deste app ({ titulo, cards: [{ pergunta,
// resposta }] }) ou do app antigo disrupt ({ title, cards: [{ title, answer }] }).
// Aceitamos os dois formatos para o usuário conseguir trazer os baralhos de lá.
// Campos desconhecidos (photo, id, evaluation, times) são ignorados.

/**
 * Lê um payload JSON arbitrário e extrai os baralhos importáveis, descartando
 * entradas sem título ou sem nenhum cartão completo.
 * @example parseImportedBaralhos([{ titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] }])
 */
export function parseImportedBaralhos(raw: unknown): ImportedBaralho[] {
  const baralhos = normalizeImportedBaralhos(raw);
  if (baralhos.length === 0) throw new EmptyImportError();
  return baralhos;
}
