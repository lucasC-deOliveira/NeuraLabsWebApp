import type { Achievement } from "@/lib/gamification-api";

// Ordena os badges para o painel: os EM ANDAMENTO mais próximos primeiro (o "quase
// lá" é o que motiva e mostra a barra de progresso), depois os conquistados do mais
// difícil ao mais fácil. Assim, mesmo numa conta que já ganhou muita coisa, os alvos
// a perseguir aparecem antes dos troféus. Parte pura, testável, sem tocar no React.
export function orderAchievements(list: Achievement[]): Achievement[] {
  const pending = list.filter((a) => !a.earned).sort((a, b) => b.progress - a.progress);
  const earned = list.filter((a) => a.earned).sort((a, b) => b.target - a.target);
  return [...pending, ...earned];
}
