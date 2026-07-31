import type { Achievement } from "@/lib/gamification-api";

// Ordena os badges para o painel: conquistados primeiro (do maior alvo, os mais
// difíceis em destaque), depois os em andamento por proximidade — o "próximo a
// desbloquear" sobe. Parte pura, testável, sem tocar no React.
export function orderAchievements(list: Achievement[]): Achievement[] {
  const earned = list.filter((a) => a.earned).sort((a, b) => b.target - a.target);
  const pending = list.filter((a) => !a.earned).sort((a, b) => b.progress - a.progress);
  return [...earned, ...pending];
}
