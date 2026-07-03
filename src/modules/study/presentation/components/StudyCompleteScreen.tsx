"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, CheckCircle2Icon, XCircleIcon, ClockIcon } from "lucide-react";
import type { SessionStats } from "../../domain/study-stats";
import { formatDuration, computeAccuracy } from "../../domain/study-stats";
import { nowMs } from "../study-clock";

function PerformanceBadge({ accuracy }: { accuracy: number }) {
  if (accuracy >= 80) {
    return (
      <Badge variant="default" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
        <CheckCircle2Icon className="size-3" />
        Excelente desempenho
      </Badge>
    );
  }
  if (accuracy >= 50) {
    return (
      <Badge variant="secondary" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
        Bom progresso, continue praticando
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="mx-auto w-fit gap-1 px-2 sm:px-3 py-1 text-xs">
      <XCircleIcon className="size-3" />
      Revise os conceitos novamente
    </Badge>
  );
}

export function StudyCompleteScreen({ stats, onExit }: { stats: SessionStats; onExit: () => void }) {
  const elapsedTime = (stats.endTime ? stats.endTime.getTime() : nowMs()) - stats.startTime.getTime();
  const accuracy = computeAccuracy(stats.correctCount, stats.totalCards);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b px-3 sm:px-5 py-3 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <ArrowLeftIcon className="mr-1 size-4" />
            Voltar
          </Button>
          <h1 className="text-base sm:text-lg font-semibold">Sessao Concluida</h1>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-3 sm:px-5 py-8 sm:py-12">
        <Card className="mx-auto max-w-md w-full border-green-200 bg-green-50/30 dark:border-green-800/50 dark:bg-green-950/20">
          <CardHeader className="items-center space-y-2 px-4 sm:px-6">
            <CheckCircle2Icon className="size-8 sm:size-12 text-green-600 dark:text-green-500" />
            <CardTitle className="text-center text-xl sm:text-2xl">Parabens!</CardTitle>
            <p className="text-center text-xs sm:text-sm text-muted-foreground">
              Voce concluiu a sessao de estudo
            </p>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Cartoes</p>
                <p className="text-2xl sm:text-3xl font-semibold">{stats.totalCards}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Precisao</p>
                <p className="text-2xl sm:text-3xl font-semibold">{accuracy}%</p>
              </div>
              <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Acertos</p>
                <p className="text-xl sm:text-2xl font-semibold text-green-600">{stats.correctCount}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Erros</p>
                <p className="text-xl sm:text-2xl font-semibold text-red-500">{stats.incorrectCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <ClockIcon className="size-3.5 sm:size-4" />
              <span>Tempo total: {formatDuration(elapsedTime)}</span>
            </div>

            <PerformanceBadge accuracy={accuracy} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
