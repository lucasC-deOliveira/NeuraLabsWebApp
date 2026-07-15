"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { SparklesIcon, BrainIcon } from "lucide-react";
import { NewFlashcardFromNotaMode } from "./components/NewFlashcardFromNotaMode";
import { NewFlashcardManualMode } from "./components/NewFlashcardManualMode";

type PageMode = "from-nota" | "manual";

export function NewFlashcardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("from-nota");

  return (
    <PageContainer className="space-y-6">
      {/* O voltar agora é do PageHeader (a rota é interna a Flashcards). */}
      <PageHeader
        title="Novo Flashcard"
        subtitle={mode === "from-nota" ? "Gere a partir de nota existente." : "Crie manualmente."}
      />

      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button type="button" onClick={() => setMode("from-nota")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "from-nota" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via Nota
        </button>
        <button type="button" onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>

      {mode === "from-nota" ? <NewFlashcardFromNotaMode router={router} /> : <NewFlashcardManualMode router={router} />}
    </PageContainer>
  );
}
