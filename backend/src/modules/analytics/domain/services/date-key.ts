// Chave de dia (YYYY-MM-DD) em UTC — estável para agrupar/ordenar séries temporais.
// v1 usa UTC; refinar para fuso local é um passo futuro.
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
