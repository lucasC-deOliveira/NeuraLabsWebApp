"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useEffect, useMemo, useState } from "react";
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

function QuickActions() {
  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="mb-3 text-base sm:text-lg font-semibold">Ações rápidas</h2>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {/* A página /study saiu: estudar agora é escolher um baralho. */}
        <Link href="/baralhos"><Button size="lg" className="text-sm sm:text-base px-4 sm:px-6">Estudar agora</Button></Link>
        <Link href="/flashcards/new"><Button variant="outline" size="lg">Adicionar flashcard</Button></Link>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [sessions, setSessions] = useState<StudySessionEntry[]>([]);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dashboardHttp.getSubjects(), dashboardHttp.getSessionHistory(), dashboardHttp.getFlashcards()])
      .then(([subjectsData, sessionsData, flashcardsData]) => {
        if (cancelled) return;
        setSubjects(toSubjectSummaries(subjectsData));
        setSessions(sessionsData.slice(0, 5));
        setDueCardCount(countDueCards(flashcardsData));
      })
      .catch((err) => console.error("Failed to load dashboard data:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const accuracy = useMemo(() => computeAccuracy(sessions), [sessions]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <PageContainer>
          <PageHeader title="NeuraLabs" subtitle="Flashcards Inteligentes com IA" />

          <DashboardStatCards loading={loading} dueCardCount={dueCardCount} accuracy={accuracy} />
          <QuickActions />
          <Separator className="my-4 sm:my-6" />
          <SubjectsGrid loading={loading} subjects={subjects} />
          <Separator className="my-4 sm:my-6" />
          <RecentActivity loading={loading} sessions={sessions} />
        </PageContainer>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
