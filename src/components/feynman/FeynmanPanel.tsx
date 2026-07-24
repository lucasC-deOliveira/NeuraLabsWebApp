"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SparklesIcon, Loader2Icon, LightbulbIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeFeynman, saveFeynmanAttempt } from "@/lib/feynman-api";
import type { FeynmanAlvoTipo, FeynmanFeedback } from "./feynman.types";
import { FeynmanFeedbackView } from "./FeynmanFeedbackView";

// Miolo da Feynman (explicar → avaliar → feedback → salvar), reusado pelo modal
// simples e pelo modo em série. Reseta ao trocar de alvo. `footerLeft` é um slot
// para a navegação do modo em série.
export function FeynmanPanel({ alvoTipo, alvoId, footerLeft }: {
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string | null;
  footerLeft?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);

  if (alvoId !== prevId) {
    setPrevId(alvoId);
    setTexto("");
    setFeedback(null);
    setError(null);
  }

  const avaliar = (): void => {
    if (!alvoId || !texto.trim()) return;
    setLoading(true);
    setError(null);
    gradeFeynman(alvoTipo, alvoId, texto)
      .then((fb) => setFeedback(fb))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao avaliar."))
      .finally(() => setLoading(false));
  };

  const salvar = (): void => {
    if (!alvoId || !feedback) return;
    setSaving(true);
    saveFeynmanAttempt(alvoTipo, alvoId, texto, feedback)
      .then(() => toast.success("Explicação salva — a re-explicação foi agendada."))
      .catch(() => toast.error("Não foi possível salvar a explicação."))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto py-4">
        <div className="flex items-start gap-2 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 text-xs text-muted-foreground">
          <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-violet-500" />
          <p>Explique como se ensinasse a uma criança — sem jargão. A IA aponta o que faltou e onde revisar.</p>
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva sua explicação aqui…"
          rows={6}
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary/60"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {feedback && <FeynmanFeedbackView feedback={feedback} />}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-2">{footerLeft}</div>
        <div className="flex items-center gap-2">
          {feedback && (
            <Button variant="outline" onClick={salvar} disabled={saving} className="gap-2">
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Salvar
            </Button>
          )}
          <Button onClick={avaliar} disabled={loading || !texto.trim()} className="gap-2">
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
            {feedback ? "Reavaliar" : "Avaliar com IA"}
          </Button>
        </div>
      </div>
    </>
  );
}
