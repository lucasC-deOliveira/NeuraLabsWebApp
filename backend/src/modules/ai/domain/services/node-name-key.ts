// Deterministic dedup key for structural nodes (ASSUNTO/TOPICO/CONCEITO). Two
// names collapse to the same key — and are treated as the same node on import —
// when they differ only by case, accents, or surrounding/inner whitespace.
//
// Kept deliberately conservative: punctuation is PRESERVED so "C", "C++" and "C#"
// stay distinct. Auto-reuse here is irreversible (the node is silently merged on
// import), so only unambiguous variants are folded. Semantic near-duplicates
// ("Pilha" ↔ "Stack") are left to the similarity/LLM detectors, which propose a
// merge for human review instead of deciding on their own.

// Combining diacritical marks left over after NFD decomposition (á → a +  ́ ).
const DIACRITICS = /[̀-ͯ]/g;

/** Normalizes a node name for dedup: lowercase, accent-free, single-spaced. */
export function normalizeNodeName(nome: string): string {
  return nome.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Builds the "tipo|nomeNormalizado" index key used to reuse existing nodes. */
export function nodeNameKey(tipo: string, nome: string): string {
  return `${tipo}|${normalizeNodeName(nome)}`;
}
