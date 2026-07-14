// Funde as questões melhoradas pela IA (em lote) de volta nas questões extraídas:
// só troca enunciado, explicação e os TEXTOS das alternativas (casando por letra).
// Gabarito, tipo, imagens e demais campos são preservados. Casa por `numero`. Pura.

export interface MinAlternativa {
  letra: string;
  texto: string;
}

export interface MinQuestao {
  numero: number;
  enunciado: string;
  alternativas: MinAlternativa[] | null;
  explicacao?: string | null;
}

export interface ImprovedQuestao {
  numero: number;
  enunciado: string;
  alternativas: MinAlternativa[];
  explicacao: string;
}

export interface BatchInputQuestao {
  numero: number;
  tipo: string;
  enunciado: string;
  alternativas: MinAlternativa[];
  gabarito: string;
  explicacao: string;
}

/** Mapeia as questões extraídas para o formato do batch de melhoria por IA. */
export function toImproveBatchInput<T extends MinQuestao & { tipo: string; gabarito: string }>(
  questoes: T[],
): BatchInputQuestao[] {
  return questoes.map((q) => ({
    numero: q.numero,
    tipo: q.tipo,
    enunciado: q.enunciado,
    alternativas: q.alternativas ?? [],
    gabarito: q.gabarito,
    explicacao: q.explicacao ?? "",
  }));
}

export function mergeImprovedQuestoes<T extends MinQuestao>(parsed: T[], improved: ImprovedQuestao[]): T[] {
  const byNumero = new Map(improved.map((i) => [i.numero, i]));
  return parsed.map((q) => {
    const imp = byNumero.get(q.numero);
    if (!imp) return q;
    return {
      ...q,
      enunciado: imp.enunciado,
      explicacao: imp.explicacao,
      alternativas: mergeAlternativas(q.alternativas, imp.alternativas),
    };
  });
}

function mergeAlternativas(
  original: MinAlternativa[] | null,
  improved: MinAlternativa[],
): MinAlternativa[] | null {
  if (!original) return original;
  const byLetra = new Map(improved.map((a) => [a.letra, a.texto]));
  return original.map((a) => ({ letra: a.letra, texto: byLetra.get(a.letra) ?? a.texto }));
}
