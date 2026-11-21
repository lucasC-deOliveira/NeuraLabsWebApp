"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({ title, value, description, accent = "" }: {
  title: string; value: string; description: string; accent?: string;
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <p className={`text-xl sm:text-2xl font-semibold ${accent}`}>{value}</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardStatCards({ loading, dueCardCount, accuracy, streak, examAttempts }: {
  loading: boolean; dueCardCount: number; accuracy: number | null; streak: number; examAttempts?: number;
}) {
  return (
    <section className={`mb-6 sm:mb-8 grid gap-3 sm:grid-cols-2 ${examAttempts === undefined ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      <StatCard
        title="Cartões para revisar hoje"
        value={loading ? "..." : String(dueCardCount)}
        description="Próximas revisões pendentes"
        accent="text-amber-600 dark:text-amber-400"
      />
      {examAttempts !== undefined && <StatCard
        title="Tentativas de prova"
        value={loading ? "..." : String(examAttempts)}
        description="Provas concluídas no vault"
      />}
      <StatCard
        title="Taxa de acerto"
        value={loading ? "..." : accuracy !== null ? `${accuracy}%` : "N/A"}
        description={accuracy !== null ? (examAttempts === undefined ? "Nas últimas sessões" : "Nas revisões de flashcards do vault") : "Estude para ver suas estatísticas"}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        title="Dias consecutivos"
        value={loading ? "..." : String(streak)}
        description={streak > 0 ? "Ofensiva atual de estudo" : "Estude hoje para começar a ofensiva"}
        accent="text-orange-500 dark:text-orange-400"
      />
    </section>
  );
}
