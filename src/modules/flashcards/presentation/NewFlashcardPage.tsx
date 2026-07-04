"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon, BrainIcon, ChevronLeftIcon } from "lucide-react";
import { NewFlashcardFromNotaMode } from "./components/NewFlashcardFromNotaMode";
import { NewFlashcardManualMode } from "./components/NewFlashcardManualMode";

type PageMode = "from-nota" | "manual";

export function NewFlashcardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("from-nota");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Novo Flashcard</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {mode === "from-nota" ? "Gere a partir de nota existente." : "Crie manualmente."}
          </p>
        </div>
        <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 flex-shrink-0">
          <ChevronLeftIcon className="size-3" />Voltar
        </button>
      </div>
      <Separator />

      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button type="button" onClick={() => setMode("from-nota")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "from-nota" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via Nota
        </button>
        <button type="button" onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>

      {mode === "from-nota" ? <NewFlashcardFromNotaMode router={router} /> : <NewFlashcardManualMode router={router} />}
    </div>
  );
}
