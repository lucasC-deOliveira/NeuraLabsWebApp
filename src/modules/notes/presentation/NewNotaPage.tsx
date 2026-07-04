"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon, BrainIcon } from "lucide-react";
import { NewNotaIaMode } from "./components/NewNotaIaMode";
import { NewNotaManualMode } from "./components/NewNotaManualMode";

type PageMode = "ia" | "manual";

export function NewNotaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("ia");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Nova Nota</h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {mode === "ia" ? "Cole texto bruto e a IA identifica notas." : "Preencha manualmente com relacoes."}
        </p>
      </div>
      <Separator />
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button onClick={() => setMode("ia")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "ia" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via IA
        </button>
        <button onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>
      {mode === "ia" ? <NewNotaIaMode router={router} /> : <NewNotaManualMode router={router} />}
    </div>
  );
}
