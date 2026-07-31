"use client";

import { PageContainer } from "@/components/page-container";
import { ConceptWeakSpots } from "@/components/graph/ConceptWeakSpots";
import { DailyGoalCard } from "@/components/gamification/DailyGoalCard";
import { ConquestCard } from "@/components/gamification/ConquestCard";
import { ConquestCelebration } from "@/components/gamification/ConquestCelebration";
import { ProgressCard } from "@/components/gamification/ProgressCard";
import { BuilderCard } from "@/components/gamification/BuilderCard";
import { BuilderCelebration } from "@/components/gamification/BuilderCelebration";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useMemo } from "react";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { dashboardHttp } from "../infra/http";
import type { SubjectSummary, StudySessionEntry } from "../domain/dashboard.types";
import { computeAccuracy, countDueCards, toSubjectSummaries } from "../domain/services/dashboard-metrics";
import { DashboardStatCards } from "./components/DashboardStatCards";
import { SubjectsGrid } from "./components/SubjectsGrid";
import { RecentActivity } from "./components/RecentActivity";
import { AnalyticsSummaryCard } from "@/modules/analytics/presentation/components/AnalyticsSummaryCard";
import { PlanTodayCard } from "@/components/study-plan/PlanTodayCard";

function QuickActions() {
  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="mb-3 text-base sm:text-lg font-semibold">Ações rápidas</h2>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {/* "Estudar agora" abre o Plano de Estudo (sessão do dia, intercalada). */}
        <Link href="/estudo"><Button size="lg" className="text-sm sm:text-base px-4 sm:px-6">Estudar agora</Button></Link>
        <Link href="/flashcards/new"><Button variant="outline" size="lg">Adicionar flashcard</Button></Link>
      </div>
    </section>
  );
}

interface DashboardData {
  subjects: SubjectSummary[];
  sessions: StudySessionEntry[];
  dueCardCount: number;
  streak: number;
}

// Deriva o payload MÍNIMO da home (resumos + 5 sessões + vencidos + ofensiva) —
// os flashcards crus não vão para o cache (evita duplicar o cache de flashcards).
async function loadDashboard(): Promise<DashboardData> {
  const [subjectsData, sessionsData, flashcardsData, streak] = await Promise.all([
    dashboardHttp.getSubjects(),
    dashboardHttp.getSessionHistory(),
    dashboardHttp.getFlashcards(),
    dashboardHttp.getStreak(),
  ]);
  return {
    subjects: toSubjectSummaries(subjectsData),
    sessions: sessionsData.slice(0, 5),
    dueCardCount: countDueCards(flashcardsData),
    streak,
  };
}

// JSON perde o tipo Date; as sessões carregam datas que o cache reconstrói na leitura.
function reviveDashboard(d: DashboardData): DashboardData {
  const sessions = d.sessions.map((s) => ({
    ...s,
    dataInicio: new Date(s.dataInicio),
    dataFim: s.dataFim ? new Date(s.dataFim) : null,
  }));
  return { ...d, sessions };
}

export function DashboardPage() {
  const { data, loading } = useCachedResource(
    { key: "dashboard.home", version: 2, tags: ["dashboard"], revive: reviveDashboard },
    loadDashboard,
    "",
  );
  const subjects = data?.subjects ?? [];
  const sessions = data?.sessions ?? [];
  const dueCardCount = data?.dueCardCount ?? 0;
  const streak = data?.streak ?? 0;
  const accuracy = useMemo(() => computeAccuracy(data?.sessions ?? []), [data]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <PageContainer>
          <PageHeader title="NeuraLabs" subtitle="Flashcards Inteligentes com IA" />

          <DashboardStatCards loading={loading} dueCardCount={dueCardCount} accuracy={accuracy} streak={streak} />
          <div className="mb-6 space-y-3 sm:mb-8">
            <ConquestCelebration />
            <BuilderCelebration />
            <DailyGoalCard />
            <ProgressCard />
            <ConquestCard />
            <BuilderCard />
            <PlanTodayCard />
            <AnalyticsSummaryCard />
          </div>
          <QuickActions />
          <Separator className="my-4 sm:my-6" />
          <SubjectsGrid loading={loading} subjects={subjects} />
          <Separator className="my-4 sm:my-6" />
          <ConceptWeakSpots />
          <RecentActivity loading={loading} sessions={sessions} />
        </PageContainer>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
