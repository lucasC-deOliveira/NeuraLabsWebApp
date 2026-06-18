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
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, RouteIcon, AlertCircleIcon, RefreshCwIcon, CheckIcon } from "lucide-react";
import { generateLearningPath } from "@/lib/ai-api";

interface LearningPathModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
}

type Step = { nodeId: string; nome: string; tipo: string; motivo: string };
type UIStep = "idle" | "loading" | "done" | "error";

const TYPE_COLOR: Record<string, string> = {
  ASSUNTO: "text-blue-500",
  TOPICO: "text-purple-500",
  CONCEITO: "text-green-500",
};

const TYPE_LABEL: Record<string, string> = {
  ASSUNTO: "Assunto",
  TOPICO: "Tópico",
  CONCEITO: "Conceito",
};

const LOADING_STEPS = [
  "Lendo nós e relações do grafo...",
  "Analisando dependências entre conceitos...",
  "Identificando pré-requisitos implícitos...",
  "Ordenando do básico ao avançado...",
  "Validando sequência de aprendizado...",
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

export function LearningPathModal({ open, onOpenChange, grafoId }: LearningPathModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (uiStep === "loading") {
      setElapsed(0);
      setSubStep(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      subStepRef.current = setInterval(() => setSubStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    };
  }, [uiStep]);

  const load = async () => {
    setUiStep("loading");
    try {
      const res = await generateLearningPath(grafoId);
      setSteps(res.steps);
      setUiStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar trilha.");
      setUiStep("error");
    }
  };

  useEffect(() => {
    if (open && uiStep === "idle") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (o: boolean) => {
    if (!o && uiStep === "loading") return;
    if (!o) setUiStep("idle");
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="size-4 text-primary" />
            Trilha de aprendizado
          </DialogTitle>
          <DialogDescription>
            Sequência ordenada do básico ao avançado, gerada pela IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {uiStep === "loading" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow
                index={1}
                label="Analisando o grafo com IA"
                sublabel={LOADING_STEPS[subStep]}
                status="active"
                elapsed={elapsed}
              />
              <StepRow index={2} label="Apresentar trilha ordenada" status="pending" />
              {elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {uiStep === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}

          {uiStep === "done" && steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum passo gerado. Adicione mais nós ao grafo.
            </p>
          )}

          {uiStep === "done" && steps.length > 0 && (
            <ol className="space-y-2 pr-1">
              {steps.map((step, i) => (
                <li key={step.nodeId} className="flex gap-3 rounded-lg border border-border p-3">
                  <span className="shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${TYPE_COLOR[step.tipo] ?? "text-foreground"}`}
                      >
                        {TYPE_LABEL[step.tipo] ?? step.tipo}
                      </Badge>
                      <span className="text-sm font-medium leading-tight">{step.nome}</span>
                    </div>
                    {step.motivo && (
                      <p className="text-xs text-muted-foreground leading-snug">{step.motivo}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <Separator className="my-3 shrink-0" />
        <div className="shrink-0 flex gap-2">
          {uiStep === "loading" && (
            <Button className="flex-1" variant="secondary" disabled>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {(uiStep === "done" || uiStep === "error") && (
            <Button variant="outline" className="gap-2" onClick={load}>
              <RefreshCwIcon className="size-4" />
              Regerar
            </Button>
          )}

          {uiStep !== "loading" && (
            <Button className="flex-1" variant="secondary" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
