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
import { graphHttp } from "@/modules/graph/infra/http";
import type { LearningStep } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

interface LearningPathModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
}

type UIStep = "loading" | "done" | "error";

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

export function LearningPathModal({ open, onOpenChange, grafoId }: LearningPathModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("loading");
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setUiStep("loading"); setErrorMsg(""); setElapsed(0); setSubStep(0); }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .generateLearningPath(grafoId)
      .then((res) => { if (!ignore) { setSteps(res.steps); setUiStep("done"); } })
      .catch((e) => { if (!ignore) { setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar trilha."); setUiStep("error"); } });
    return () => { ignore = true; };
  }, [open, grafoId, nonce]);

  useEffect(() => {
    if (uiStep !== "loading") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const stepTimer = setInterval(() => setSubStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 2500);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [uiStep]);

  const regenerate = () => { setUiStep("loading"); setElapsed(0); setSubStep(0); setNonce((n) => n + 1); };
  const handleOpenChange = (o: boolean) => {
    if (!o && uiStep === "loading") return;
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
          <DialogDescription>Sequência ordenada do básico ao avançado, gerada pela IA.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <PathBody uiStep={uiStep} elapsed={elapsed} subStep={subStep} errorMsg={errorMsg} steps={steps} />
        </div>

        <Separator className="my-3 shrink-0" />
        <PathFooter uiStep={uiStep} onRegenerate={regenerate} onClose={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PathBody({ uiStep, elapsed, subStep, errorMsg, steps }: { uiStep: UIStep; elapsed: number; subStep: number; errorMsg: string; steps: LearningStep[] }) {
  if (uiStep === "loading") return <LoadingView elapsed={elapsed} subStep={subStep} />;
  if (uiStep === "error") return <ErrorView message={errorMsg} />;
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhum passo gerado. Adicione mais nós ao grafo.</p>;
  }
  return <PathList steps={steps} />;
}

function PathFooter({ uiStep, onRegenerate, onClose }: { uiStep: UIStep; onRegenerate: () => void; onClose: () => void }) {
  return (
    <div className="shrink-0 flex gap-2">
      {uiStep === "loading" && (
        <Button className="flex-1" variant="secondary" disabled>
          <Loader2Icon className="size-4 mr-2 animate-spin" />
          Montando a trilha…
        </Button>
      )}
      {uiStep !== "loading" && (
        <>
          <Button variant="outline" className="gap-2" onClick={onRegenerate}>
            <RefreshCwIcon className="size-4" />
            Regerar
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </>
      )}
    </div>
  );
}

function LoadingView({ elapsed, subStep }: { elapsed: number; subStep: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Analisando o grafo com IA" sublabel={LOADING_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={2} label="Apresentar trilha ordenada" status="pending" />
      {elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
          A IA está processando — modelos locais podem levar 1-2 minutos.
        </p>
      )}
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function PathList({ steps }: { steps: LearningStep[] }) {
  return (
    <ol className="space-y-2 pr-1">
      {steps.map((step, i) => (
        <li key={step.nodeId} className="flex gap-3 rounded-lg border border-border p-3">
          <span className="shrink-0 flex items-center justify-center size-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLOR[step.tipo] ?? "text-foreground"}`}>
                {TYPE_LABEL[step.tipo] ?? step.tipo}
              </Badge>
              <span className="text-sm font-medium leading-tight">{step.nome}</span>
            </div>
            {step.motivo && <p className="text-xs text-muted-foreground leading-snug">{step.motivo}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
