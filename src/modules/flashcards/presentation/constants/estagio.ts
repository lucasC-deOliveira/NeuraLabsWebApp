// Learning-stage labels and badge styles (1..5) for flashcard cards/detail.

export const ESTAGIO_LABELS: Record<number, string> = {
  1: "Novo",
  2: "Aprendiz",
  3: "Conhece",
  4: "Familiar",
  5: "Dominado",
};

export const ESTAGIO_STYLES: Record<number, string> = {
  1: "text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400 ring-red-200 dark:ring-red-800",
  2: "text-orange-500 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 ring-orange-200 dark:ring-orange-800",
  3: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400 ring-yellow-200 dark:ring-yellow-800",
  4: "text-sky-500 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 ring-sky-200 dark:ring-sky-800",
  5: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800",
};

/** Truncates text to `max` chars with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
