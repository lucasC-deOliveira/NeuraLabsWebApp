// Valida a janela de dias vinda da query (?days=N). Valor ausente/inválido cai no
// padrão; grampeia entre 1 dia e ~100 anos ("tudo").
const MIN_DAYS = 1;
const MAX_DAYS = 36_500;
const DEFAULT_DAYS = 90;

export function clampDays(raw: unknown): number {
  const days = Number(raw);
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_DAYS;
  return Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(days)));
}
