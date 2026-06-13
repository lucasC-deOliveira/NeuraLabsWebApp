"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStudySessionHistory, getSubjects, getFlashcards } from "@/lib/content-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubjectSummary {
  id: string;
  nome: string;
  descricao: string | null;
  topicoCount: number;
}

interface SessionEntry {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  avgConfidence: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  return `${diffDays} dia(s) atrás`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [dueCardCount, setDueCardCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [subjectsData, sessionsData, flashcardsData] =
          await Promise.all([getSubjects(), getStudySessionHistory(), getFlashcards()]);

        setSubjects(
          subjectsData.map((s) => ({
            id: s.id,
            nome: s.nome,
            descricao: s.descricao,
            topicoCount: s.topicos.length,
          })),
        );

        setSessions(sessionsData.slice(0, 5));

        // Count due cards: cards with no schedule (new) or proximaRevisao <= now
        const now = new Date();
        const due = flashcardsData.filter((fc) => {
          if (!fc.spacedRepetition) return true;
          return new Date(fc.spacedRepetition.proximaRevisao) <= now;
        });
        setDueCardCount(due.length);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute overall accuracy from session history
  const accuracy = (() => {
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
    const totalReviews = sessions.reduce((sum, s) => sum + s.totalReviews, 0);
    if (totalReviews === 0) return null;
    return Math.round((totalCorrect / totalReviews) * 100);
  })();

  // -----------------------------------------------------------------------
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 lg:px-8">
          {/* Header */}
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              NeuraLabs
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Flashcards Inteligentes com IA
            </p>
          </header>

          {/* Stats Row */}
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
                <CardTitle className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Dias consecutivos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <p className="text-xl sm:text-2xl font-semibold">Em breve</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Recurso em produção
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="mb-6 sm:mb-8">
            <h2 className="mb-3 text-base sm:text-lg font-semibold">Ações rápidas</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/study">
                <Button size="lg" className="text-sm sm:text-base px-4 sm:px-6">Estudar agora</Button>
              </Link>
              <Link href="/reviews">
                <Button variant="outline" size="lg">Revisões</Button>
              </Link>
              <Link href="/flashcards/new">
                <Button variant="outline" size="lg">Adicionar flashcard</Button>
              </Link>
            </div>
          </section>

          <Separator className="my-4 sm:my-6" />

          {/* Subject Navigation */}
          <section className="mb-6 sm:mb-8">
            <h2 className="mb-3 text-base sm:text-lg font-semibold">Matérias</h2>

            {loading ? (
              <p className="text-xs sm:text-sm text-zinc-400">Carregando matérias...</p>
            ) : subjects.length === 0 ? (
              <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
                <CardContent className="py-6 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma matéria cadastrada ainda.
                  </p>
                  <Link href="/flashcards/new">
                    <Button variant="link" className="mt-1">Criar o primeira</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <Link key={subject.id} href={`/subjects/${subject.id}`}>
                    <Card className="cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 border-zinc-200 dark:border-zinc-800 h-full">
                      <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardTitle className="text-sm sm:text-base">{subject.nome}</CardTitle>
                        {subject.descricao && (
                          <CardDescription className="text-xs">{subject.descricao}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        <Badge variant="secondary" className="text-xs">
                          {subject.topicoCount} {subject.topicoCount === 1 ? "tópico" : "tópicos"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <Separator className="my-4 sm:my-6" />

          {/* Recent Activity */}
          <section className="mb-6 sm:mb-8">
            <h2 className="mb-3 text-base sm:text-lg font-semibold">Atividade recente</h2>

            {loading ? (
              <p className="text-xs sm:text-sm text-zinc-400">Carregando sessões...</p>
            ) : sessions.length === 0 ? (
              <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
                <CardContent className="py-6 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma sessão de estudo ainda.
                  </p>
                  <Link href="/study">
                    <Button variant="link">Começar a estudar</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {sessions.map((session) => {
                    const pct =
                      session.totalReviews > 0
                        ? Math.round((session.correctCount / session.totalReviews) * 100)
                        : 0;
                    return (
                      <div
                        key={session.id}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-medium">
                            {formatRelativeDate(session.dataInicio)}
                          </span>
                          <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                            {session.totalReviews} cartas revisadas
                          </span>
                        </div>
                        <div className="flex items-center gap-3 sm:w-48">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs font-medium tabular-nums">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>
        </div>
      </div>

      <Toaster />
    </TooltipProvider>
  );
}

// -----------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------

function StatCard({
  title,
  value,
  description,
  accent = "",
}: {
  title: string;
  value: string;
  description: string;
  accent?: string;
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <p className={`text-xl sm:text-2xl font-semibold ${accent}`}>{value}</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}
