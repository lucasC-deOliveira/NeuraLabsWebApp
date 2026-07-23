// Opções do filtro de período. `days` vira o ?days= do backend ("tudo" = ~100 anos).
export type PeriodValue = "7" | "30" | "90" | "365" | "all";

export const PERIOD_OPTIONS: { value: PeriodValue; label: string; days: number }[] = [
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "90", label: "90 dias", days: 90 },
  { value: "365", label: "1 ano", days: 365 },
  { value: "all", label: "Tudo", days: 36_500 },
];

export const DEFAULT_PERIOD: PeriodValue = "90";

export function periodDays(value: PeriodValue): number {
  return PERIOD_OPTIONS.find((o) => o.value === value)?.days ?? 90;
}
