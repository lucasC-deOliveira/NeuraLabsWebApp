"use client";

import { useEffect, useState } from "react";
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
import { Loader2Icon, RouteIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
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

export function LearningPathModal({ open, onOpenChange, grafoId }: LearningPathModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Gerando trilha de aprendizado...</p>
              <p className="text-xs text-center max-w-xs">
                A IA está analisando as dependências entre os nós para sugerir a melhor sequência.
              </p>
            </div>
          )}

          {uiStep === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
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
          {(uiStep === "done" || uiStep === "error") && (
            <Button variant="outline" className="gap-2" onClick={load}>
              <RefreshCwIcon className="size-4" />
              Regerar
            </Button>
          )}
          <Button className="flex-1" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
