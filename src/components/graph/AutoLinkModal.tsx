"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, Link2Icon, CheckCircle2Icon, AlertCircleIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { autoLinkGraph, applyAutoLink } from "@/lib/ai-api";

interface Suggestion {
  sourceId: string;
  targetId: string;
  sourceNome: string;
  targetNome: string;
  relacao: string;
  motivo: string;
}

interface AutoLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onApplied: () => void;
}

type Step = "loading" | "results" | "applying" | "error";

const ANALYSIS_STEPS = [
  "Lendo estrutura de nós do grafo...",
  "Identificando conceitos relacionados semanticamente...",
  "Calculando relações ausentes...",
  "Pontuando relevância das sugestões...",
  "Finalizando análise...",
];

function StepRow({
  index,
  label,
  sublabel,
  status,
  elapsed,
}: {
  index: number;
  label: string;
  sublabel?: string;
  status: "done" | "active" | "pending";
  elapsed?: number;
}) {
  return (
    <div className={`flex items-start gap-3 transition-opacity ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
      <div className="mt-0.5 shrink-0">
        {status === "done" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckIcon className="size-3.5" />
          </span>
        ) : status === "active" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
            <Loader2Icon className="size-3.5 animate-spin text-primary" />
          </span>
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground font-medium">
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-tight ${status === "active" ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        {status === "active" && sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
        {status === "active" && elapsed !== undefined && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 tabular-nums">
            {Math.floor(elapsed / 60) > 0
              ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
              : `${elapsed}s`}
          </p>
        )}
      </div>
    </div>
  );
}

export function AutoLinkModal({ open, onOpenChange, grafoId, onApplied }: AutoLinkModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "loading") {
      setElapsed(0);
      setSubStep(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      subStepRef.current = setInterval(() => {
        setSubStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
      }, 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    };
  }, [step]);

  const load = async () => {
    setStep("loading");
    setSelected(new Set());
    try {
      const res = await autoLinkGraph(grafoId);
      setSuggestions(res.suggestions);
      setSelected(new Set(res.suggestions.map((_, i) => i)));
      setStep("results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao analisar o grafo.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(suggestions.map((_, i) => i)));
  };

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleApply = async () => {
    const edges = suggestions
      .filter((_, i) => selected.has(i))
      .map(s => ({ sourceId: s.sourceId, targetId: s.targetId, relacao: s.relacao }));
    if (!edges.length) return;
    setApplying(true);
    setStep("applying");
    try {
      const { added } = await applyAutoLink(grafoId, edges);
      toast.success(`${added} relação(ões) adicionada(s).`);
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar relações.");
      setStep("results");
    } finally {
      setApplying(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && (step === "loading" || step === "applying")) return;
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Link2Icon className="size-4 text-primary" />
            Auto-linking de conexões
          </DialogTitle>
          <DialogDescription>
            A IA analisa todos os nós e sugere relações que deveriam existir mas ainda não foram criadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {step === "loading" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow
                index={1}
                label="Analisando conexões com IA"
                sublabel={ANALYSIS_STEPS[subStep]}
                status="active"
                elapsed={elapsed}
              />
              <StepRow
                index={2}
                label="Apresentar sugestões"
                status="pending"
              />
              {elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {step === "applying" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow
                index={1}
                label="Analisando conexões com IA"
                status="done"
              />
              <StepRow
                index={2}
                label="Criando conexões no grafo"
                sublabel={`Adicionando ${selected.size} relação(ões)...`}
                status="active"
              />
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {step === "results" && suggestions.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2Icon className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">O grafo já está bem conectado!</p>
              <p className="text-xs text-muted-foreground">Nenhuma relação adicional foi sugerida.</p>
            </div>
          )}

          {step === "results" && suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-1 pb-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-3.5 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Selecionar todos ({suggestions.length})
                </span>
              </div>
              <Separator className="mb-2" />
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={`w-full text-left rounded-md border p-2.5 text-xs transition-all ${
                    selected.has(i)
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      onClick={e => e.stopPropagation()}
                      className="size-3 shrink-0 accent-primary"
                    />
                    <span className="font-medium">{s.sourceNome}</span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">→ {s.relacao} →</span>
                    <span className="font-medium">{s.targetNome}</span>
                  </div>
                  {s.motivo && (
                    <p className="text-muted-foreground pl-5 leading-relaxed">{s.motivo}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {step === "results" && suggestions.length > 0 && (
          <>
            <Separator className="my-3 shrink-0" />
            <div className="shrink-0">
              <Button
                className="w-full gap-2"
                onClick={handleApply}
                disabled={applying || selected.size === 0}
              >
                {applying ? <Loader2Icon className="size-4 animate-spin" /> : <Link2Icon className="size-4" />}
                Adicionar selecionadas ({selected.size})
              </Button>
            </div>
          </>
        )}

        {(step === "loading" || step === "applying") && (
          <>
            <Separator className="my-3 shrink-0" />
            <div className="shrink-0">
              <Button className="w-full" variant="secondary" disabled>
                <Loader2Icon className="size-4 mr-2 animate-spin" />
                Processando...
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
