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

export function DashboardStatCards({ loading, dueCardCount, accuracy }: {
  loading: boolean; dueCardCount: number; accuracy: number | null;
}) {
  return (
    <section className="mb-6 sm:mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Cartões para revisar hoje"
        value={loading ? "..." : String(dueCardCount)}
        description="Próximas revisões pendentes"
        accent="text-amber-600 dark:text-amber-400"
      />
      <StatCard
        title="Taxa de acerto"
        value={loading ? "..." : accuracy !== null ? `${accuracy}%` : "N/A"}
        description={accuracy !== null ? "Nas últimas sessões" : "Estude para ver suas estatísticas"}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Dias consecutivos</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <p className="text-xl sm:text-2xl font-semibold">Em breve</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Recurso em produção</p>
        </CardContent>
      </Card>
    </section>
  );
}
