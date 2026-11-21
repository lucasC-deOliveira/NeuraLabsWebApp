// Current and older Disrupt exports use different labels for the same content.
// Unknown metadata is ignored so stale IDs and previous schedules are not imported.
type RawRecord = Record<string, unknown>;

interface ImportedCard {
  pergunta: string;
  resposta: string;
}

interface ImportedBaralho {
  titulo: string;
  cards: ImportedCard[];
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

function toCard(raw: RawRecord): ImportedCard | null {
  const pergunta = text(raw.pergunta) || text(raw.title);
  const resposta = text(raw.resposta) || text(raw.answer);
  if (!pergunta || !resposta) return null;
  return { pergunta, resposta };
}

function toBaralho(raw: RawRecord): ImportedBaralho | null {
  const titulo = text(raw.titulo) || text(raw.title);
  if (!titulo || !Array.isArray(raw.cards)) return null;
  const cards = raw.cards.filter(isRecord).map(toCard).filter((card): card is ImportedCard => card !== null);
  return cards.length ? { titulo, cards } : null;
}

/** Extracts complete decks from current and legacy exports.
 * @example normalizeImportedBaralhos({ title: "Bio", cards: [{ title: "Q", answer: "A" }] })
 */
export function normalizeImportedBaralhos(raw: unknown): ImportedBaralho[] {
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter(isRecord).map(toBaralho).filter((deck): deck is ImportedBaralho => deck !== null);
}
