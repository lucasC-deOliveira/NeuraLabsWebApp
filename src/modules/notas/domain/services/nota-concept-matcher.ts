/**
 * NotaConceptMatcher — Domain service que faz match de termos extraídos
 * com conceitos existentes no sistema.
 */

interface ConceptData {
  id: string;
  nome: string;
}

export class NotaConceptMatcher {
  private allConcepts: ConceptData[];

  constructor(concepts: ConceptData[]) {
    this.allConcepts = concepts;
  }

  /**
   * Find a concept whose name matches the given term (case-insensitive, substring).
   * Returns null if no match found.
   */
  match(term: string): ConceptData | null {
    if (!term) return null;
    const lower = term.toLowerCase();

    // Exact match first
    const exact = this.allConcepts.find(
      (c) => c.nome.toLowerCase() === lower,
    );
    if (exact) return exact;

    // Substring match
    return (
      this.allConcepts.find(
        (c) =>
          c.nome.toLowerCase().includes(lower) ||
          lower.includes(c.nome.toLowerCase()),
      ) ?? null
    );
  }

  /**
   * Batch match multiple terms.
   * Returns a map of term → matched concept (or null).
   */
  matchAll(terms: string[]): Map<string, ConceptData | null> {
    const result = new Map<string, ConceptData | null>();
    for (const term of terms) {
      result.set(term, this.match(term));
    }
    return result;
  }
}
