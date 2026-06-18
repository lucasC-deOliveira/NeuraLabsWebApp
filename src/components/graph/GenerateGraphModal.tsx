"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SparklesIcon, CheckCircle2Icon, AlertCircleIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { planGraphFromText, buildGraphFromPlan, type GenerateGraphResult } from "@/lib/ai-api";

interface GenerateGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onGenerated: () => void;
}

type Phase = "input" | "planning" | "building" | "done" | "error";

const BUILD_STEPS = [
  "Criando assunto e tópicos...",
  "Criando conceitos...",
  "Gerando notas e explicações...",
  "Gerando flashcards...",
  "Salvando referências...",
  "Finalizando...",
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

export function GenerateGraphModal({ open, onOpenChange, grafoId, onGenerated }: GenerateGraphModalProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [saveBruto, setSaveBruto] = useState(true);
  const [result, setResult] = useState<GenerateGraphResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [buildSubStep, setBuildSubStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buildTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "planning") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase === "building") {
      setBuildSubStep(0);
      buildTimerRef.current = setInterval(() => {
        setBuildSubStep(s => Math.min(s + 1, BUILD_STEPS.length - 1));
      }, 700);
    } else {
      if (buildTimerRef.current) clearInterval(buildTimerRef.current);
    }
    return () => { if (buildTimerRef.current) clearInterval(buildTimerRef.current); };
  }, [phase]);

  const handleClose = (o: boolean) => {
    if (!o && (phase === "planning" || phase === "building")) return;
    if (!o) {
      setPhase("input");
      setResult(null);
      setErrorMsg("");
      setElapsed(0);
    }
    onOpenChange(o);
  };

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Cole um texto antes de gerar."); return; }
    try {
      // Etapa 1: IA analisa o texto
      setPhase("planning");
      const { plan } = await planGraphFromText(grafoId, text.trim());

      // Etapa 2: persistência no grafo
      setPhase("building");
      const res = await buildGraphFromPlan(grafoId, text.trim(), plan, saveBruto);
      setResult(res);
      setPhase("done");
      onGenerated();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar grafo.");
      setPhase("error");
    }
  };

  const planningDone = phase === "building" || phase === "done";
  const buildingDone = phase === "done";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            Gerar grafo a partir de texto
          </DialogTitle>
          <DialogDescription>
            Cole qualquer texto e a IA cria automaticamente assunto, tópicos, conceitos, notas e flashcards.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {phase === "input" && (
            <div className="space-y-3">
              <textarea
                className="w-full h-56 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Cole o texto aqui... (artigo, capítulo de livro, anotações, etc.)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                <div
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    saveBruto
                      ? "border-primary bg-primary/15"
                      : "border-muted-foreground/40 group-hover:border-primary/50"
                  }`}
                  onClick={() => setSaveBruto(v => !v)}
                >
                  {saveBruto && <CheckIcon className="size-2.5 text-primary" />}
                </div>
                <div onClick={() => setSaveBruto(v => !v)}>
                  <p className="text-sm font-medium leading-tight">Guardar texto bruto no grafo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cria um nó TEXTO_BRUTO com o conteúdo original, conectado às notas geradas.
                  </p>
                </div>
              </label>
            </div>
          )}

          {(phase === "planning" || phase === "building") && (
            <div className="space-y-5 py-4 px-1">
              <StepRow
                index={1}
                label="Analisando o texto com IA"
                sublabel="Extraindo conceitos, tópicos e estrutura curricular..."
                status={planningDone ? "done" : "active"}
                elapsed={!planningDone ? elapsed : undefined}
              />
              <StepRow
                index={2}
                label="Salvando no grafo"
                sublabel={BUILD_STEPS[buildSubStep]}
                status={phase === "building" ? "active" : buildingDone ? "done" : "pending"}
              />
              <StepRow
                index={3}
                label="Concluído"
                status="pending"
              />
              {phase === "planning" && elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {phase === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2Icon className="size-12 text-emerald-500" />
              <p className="text-base font-semibold">Grafo criado com sucesso!</p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-sm">
                <StatCard label="Assunto" value={result.assunto} small />
                <StatCard label="Tópicos" value={result.topicos} />
                <StatCard label="Conceitos" value={result.conceitos} />
                <StatCard label="Notas" value={result.notas} />
                <StatCard label="Flashcards" value={result.flashcards} />
                {result.baralho && <StatCard label="Baralho" value={result.baralho} small />}
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={() => setPhase("input")}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 border-t pt-3">
          {phase === "input" && (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={!text.trim()}>
                <SparklesIcon className="size-4" />
                Gerar grafo com IA
              </Button>
            </>
          )}
          {(phase === "planning" || phase === "building") && (
            <Button className="flex-1" variant="secondary" disabled>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}
          {phase === "done" && (
            <Button className="flex-1" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold mt-0.5 ${small ? "text-xs leading-snug" : "text-xl"}`}>{value}</p>
    </div>
  );
}
