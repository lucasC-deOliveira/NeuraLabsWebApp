"use client";

import { useState } from "react";
import { SparklesIcon, Loader2Icon, LightbulbIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gradeFeynman } from "@/lib/feynman-api";
import type { FeynmanAlvoTipo, FeynmanFeedback } from "./feynman.types";
import { FeynmanFeedbackView } from "./FeynmanFeedbackView";

interface FeynmanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string | null;
  title: string;
}

// Técnica Feynman: você explica com palavras simples e a IA aponta clareza,
// jargão, lacunas (→ conceitos) e sugere analogia/reescrita. Refina e repete.
export function FeynmanModal({ open, onOpenChange, alvoTipo, alvoId, title }: FeynmanModalProps) {
  const [texto, setTexto] = useState("");
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);

  // Reset ao abrir para um novo alvo (sem setState em efeito).
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">Explique com suas palavras</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>

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

        <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-3">
          <Button onClick={avaliar} disabled={loading || !texto.trim()} className="gap-2">
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
            {feedback ? "Reavaliar" : "Avaliar com IA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
