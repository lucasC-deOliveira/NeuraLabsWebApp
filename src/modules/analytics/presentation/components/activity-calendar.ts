export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
}

// Últimos `days` dias (do mais antigo ao mais recente), preenchendo com 0 os dias
// sem revisão — o backend só envia os dias ativos. Para o heatmap de atividade.
export function recentActivity(
  calendar: { date: string; count: number }[],
  now: Date,
  days: number,
): ActivityDay[] {
  const counts = new Map(calendar.map((d) => [d.date, d.count]));
  const out: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

// Nível de intensidade (0-4) de um dia, para a cor da célula do heatmap.
export function activityLevel(count: number): number {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 7) return 2;
  if (count < 15) return 3;
  return 4;
}
