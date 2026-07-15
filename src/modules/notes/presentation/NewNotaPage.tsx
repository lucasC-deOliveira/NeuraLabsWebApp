"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { SparklesIcon, BrainIcon } from "lucide-react";
import { NewNotaIaMode } from "./components/NewNotaIaMode";
import { NewNotaManualMode } from "./components/NewNotaManualMode";

type PageMode = "ia" | "manual";

export function NewNotaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("ia");

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Nova Nota"
        subtitle={mode === "ia" ? "Cole texto bruto e a IA identifica notas." : "Preencha manualmente com relacoes."}
      />
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button onClick={() => setMode("ia")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "ia" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via IA
        </button>
        <button onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>
      {mode === "ia" ? <NewNotaIaMode router={router} /> : <NewNotaManualMode router={router} />}
    </PageContainer>
  );
}
