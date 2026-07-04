"use client";

import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudySessionEntry } from "../../domain/dashboard.types";
import { formatRelativeDate, sessionAccuracy } from "../../domain/services/dashboard-metrics";

function SessionRow({ session }: { session: StudySessionEntry }) {
  const pct = sessionAccuracy(session);
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-medium">{formatRelativeDate(session.dataInicio)}</span>
        <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">{session.totalReviews} cartas revisadas</span>
      </div>
      <div className="flex items-center gap-3 sm:w-48">
        <Progress value={pct} className="h-2" />
        <span className="text-xs font-medium tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

export function RecentActivity({ loading, sessions }: { loading: boolean; sessions: StudySessionEntry[] }) {
  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="mb-3 text-base sm:text-lg font-semibold">Atividade recente</h2>
      {loading ? (
        <p className="text-xs sm:text-sm text-zinc-400">Carregando sessões...</p>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-6 sm:py-8 text-center">
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Nenhuma sessão de estudo ainda.</p>
            <Link href="/study">
              <Button variant="link">Começar a estudar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
          </div>
        </Card>
      )}
    </section>
  );
}
