import { useState, useEffect } from "react";
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
import { graphHttp } from "@/modules/graph/infra/http";
import type { GenerateGraphResult } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

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

export function GenerateGraphModal({ open, onOpenChange, grafoId, onGenerated }: GenerateGraphModalProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [saveBruto, setSaveBruto] = useState(true);
  const [result, setResult] = useState<GenerateGraphResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [buildSubStep, setBuildSubStep] = useState(0);

  // Timers only mutate state inside the interval callback (react-hooks v7 forbids
  // synchronous setState in the effect body — the counters are reset in the handler).
  useEffect(() => {
    if (phase !== "planning") return;
    const id = setInterval((): void => setElapsed((s) => s + 1), 1000);
    return (): void => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "building") return;
    const id = setInterval((): void => setBuildSubStep((s) => Math.min(s + 1, BUILD_STEPS.length - 1)), 700);
    return (): void => clearInterval(id);
  }, [phase]);

  const handleClose = (o: boolean): void => {
    if (!o && (phase === "planning" || phase === "building")) return;
    if (!o) {
      setPhase("input");
      setResult(null);
      setErrorMsg("");
      setElapsed(0);
    }
    onOpenChange(o);
  };

  const handleGenerate = async (): Promise<void> => {
    if (!text.trim()) { toast.error("Cole um texto antes de gerar."); return; }
    try {
      setElapsed(0);
      setPhase("planning");
      const { plan } = await graphHttp.planGraphFromText(grafoId, text.trim());

      setBuildSubStep(0);
      setPhase("building");
      const res = await graphHttp.buildGraphFromPlan(grafoId, text.trim(), plan, saveBruto);
      setResult(res);
      setPhase("done");
      onGenerated();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar grafo.");
      setPhase("error");
    }
  };

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
            <InputView text={text} onText={setText} saveBruto={saveBruto} onToggleBruto={() => setSaveBruto((v) => !v)} />
          )}
          {(phase === "planning" || phase === "building") && (
            <ProgressView phase={phase} elapsed={elapsed} buildSubStep={buildSubStep} />
          )}
          {phase === "done" && result && <DoneView result={result} />}
          {phase === "error" && <ErrorView message={errorMsg} onRetry={() => setPhase("input")} />}
        </div>

        <div className="shrink-0 flex gap-2 border-t pt-3">
          <ModalFooter phase={phase} text={text} onCancel={() => handleClose(false)} onGenerate={handleGenerate} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InputView({
  text,
  onText,
  saveBruto,
  onToggleBruto,
}: {
  text: string;
  onText: (v: string) => void;
  saveBruto: boolean;
  onToggleBruto: () => void;
}) {
  return (
    <div className="space-y-3">
      <textarea
        className="w-full h-56 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Cole o texto aqui... (artigo, capítulo de livro, anotações, etc.)"
        value={text}
        onChange={(e) => onText(e.target.value)}
      />
      <label className="flex items-start gap-2.5 cursor-pointer select-none group">
        <div
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
            saveBruto
              ? "border-primary bg-primary/15"
              : "border-muted-foreground/40 group-hover:border-primary/50"
          }`}
          onClick={onToggleBruto}
        >
          {saveBruto && <CheckIcon className="size-2.5 text-primary" />}
        </div>
        <div onClick={onToggleBruto}>
          <p className="text-sm font-medium leading-tight">Guardar texto bruto no grafo</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Cria um nó TEXTO_BRUTO com o conteúdo original, conectado às notas geradas.
          </p>
        </div>
      </label>
    </div>
  );
}

function ProgressView({ phase, elapsed, buildSubStep }: { phase: Phase; elapsed: number; buildSubStep: number }) {
  const planningDone = phase === "building" || phase === "done";
  const buildingDone = phase === "done";
  return (
    <div className="space-y-5 py-4 px-1">
      <AiStepRow
        index={1}
        label="Analisando o texto com IA"
        sublabel="Extraindo conceitos, tópicos e estrutura curricular..."
        status={planningDone ? "done" : "active"}
        elapsed={!planningDone ? elapsed : undefined}
      />
      <AiStepRow
        index={2}
        label="Salvando no grafo"
        sublabel={BUILD_STEPS[buildSubStep]}
        status={phase === "building" ? "active" : buildingDone ? "done" : "pending"}
      />
      <AiStepRow index={3} label="Concluído" status="pending" />
      {phase === "planning" && elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
          A IA está processando — modelos locais podem levar 1-2 minutos.
        </p>
      )}
    </div>
  );
}

function DoneView({ result }: { result: GenerateGraphResult }) {
  return (
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
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

function ModalFooter({
  phase,
  text,
  onCancel,
  onGenerate,
}: {
  phase: Phase;
  text: string;
  onCancel: () => void;
  onGenerate: () => void;
}) {
  if (phase === "input") {
    return (
      <>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1 gap-2" onClick={onGenerate} disabled={!text.trim()}>
          <SparklesIcon className="size-4" />
          Gerar grafo com IA
        </Button>
      </>
    );
  }
  if (phase === "planning" || phase === "building") {
    return (
      <Button className="flex-1" variant="secondary" disabled>
        <Loader2Icon className="size-4 mr-2 animate-spin" />
        Gerando o grafo…
      </Button>
    );
  }
  if (phase === "done") {
    return (
      <Button className="flex-1" onClick={onCancel}>
        Fechar
      </Button>
    );
  }
  return null;
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold mt-0.5 ${small ? "text-xs leading-snug" : "text-xl"}`}>{value}</p>
    </div>
  );
}
