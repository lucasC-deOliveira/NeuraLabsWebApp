"use client";

import { useState } from "react";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { FlashcardAnalyticsTab } from "./components/FlashcardAnalyticsTab";
import { ProvaAnalyticsTab } from "./components/ProvaAnalyticsTab";

type Tab = "flashcards" | "questoes" | "baralhos";

const TABS: { id: Tab; label: string; ready: boolean }[] = [
  { id: "flashcards", label: "Flashcards", ready: true },
  { id: "questoes", label: "Questões/Provas", ready: true },
  { id: "baralhos", label: "Baralhos", ready: false },
];

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("flashcards");
  return (
    <PageContainer className="space-y-4 sm:space-y-6">
      <PageHeader title="Analytics" subtitle="Seu desempenho no estudo, em gráficos" />

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.ready}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${!t.ready ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {t.label}
            {!t.ready && <span className="ml-1 text-[10px]">(em breve)</span>}
          </button>
        ))}
      </div>

      {tab === "flashcards" && <FlashcardAnalyticsTab />}
      {tab === "questoes" && <ProvaAnalyticsTab />}
    </PageContainer>
  );
}
