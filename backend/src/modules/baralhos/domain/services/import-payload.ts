import { EmptyImportError } from '../errors';
import type { ImportedBaralho, ImportedCard } from '../baralho-views';

// O JSON importado pode vir do export deste app ({ titulo, cards: [{ pergunta,
// resposta }] }) ou do app antigo disrupt ({ title, cards: [{ title, answer }] }).
// Aceitamos os dois formatos para o usuário conseguir trazer os baralhos de lá.
// Campos desconhecidos (photo, id, evaluation, times) são ignorados.

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function toCard(raw: RawRecord): ImportedCard | null {
  const pergunta = text(raw.pergunta) || text(raw.title);
  const resposta = text(raw.resposta) || text(raw.answer);
  if (!pergunta || !resposta) return null;
  return { pergunta, resposta };
}

function toCards(raw: unknown): ImportedCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map(toCard)
    .filter((card): card is ImportedCard => card !== null);
}

function toBaralho(raw: RawRecord): ImportedBaralho | null {
  const titulo = text(raw.titulo) || text(raw.title);
  const cards = toCards(raw.cards);
  if (!titulo || cards.length === 0) return null;
  return { titulo, cards };
}

/**
 * Lê um payload JSON arbitrário e extrai os baralhos importáveis, descartando
 * entradas sem título ou sem nenhum cartão completo.
 * @example parseImportedBaralhos([{ titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] }])
 */
export function parseImportedBaralhos(raw: unknown): ImportedBaralho[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const baralhos = list
    .filter(isRecord)
    .map(toBaralho)
    .filter((baralho): baralho is ImportedBaralho => baralho !== null);
  if (baralhos.length === 0) throw new EmptyImportError();
  return baralhos;
}
