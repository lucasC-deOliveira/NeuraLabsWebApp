import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, PlusIcon, CheckIcon, GitBranchIcon, AlertCircleIcon, SparklesIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { MissingPrereq } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

interface MissingPrereqsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onAdded: () => void;
}

type Step = "loading" | "results" | "adding" | "error";
const TIPO_COLORS: Record<string, string> = { TOPICO: "#0ea5e9", CONCEITO: "#10b981" };
const ANALYSIS_STEPS = [
  "Mapeando estrutura de conhecimento do grafo...",
  "Identificando lacunas conceituais...",
  "Verificando cadeia de dependências...",
  "Sugerindo pré-requisitos ausentes...",
  "Finalizando análise...",
];

function toggleNum(prev: Set<number>, i: number): Set<number> {
  const next = new Set(prev);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

export function MissingPrereqsModal({ open, onOpenChange, grafoId, onAdded }: MissingPrereqsModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [prereqs, setPrereqs] = useState<MissingPrereq[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setStep("loading"); setAdded(new Set()); setSelected(new Set()); setErrorMsg(""); setElapsed(0); setSubStep(0); }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .detectMissingPrerequisites(grafoId)
      .then((res) => { if (!ignore) { setPrereqs(res.prerequisites); setStep("results"); } })
      .catch((e) => { if (!ignore) { setErrorMsg(e instanceof Error ? e.message : "Erro ao analisar pré-requisitos."); setStep("error"); } });
    return () => { ignore = true; };
  }, [open, grafoId, nonce]);

  useEffect(() => {
    if (step !== "loading") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const stepTimer = setInterval(() => setSubStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 2500);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [step]);

  const retry = () => { setStep("loading"); setAdded(new Set()); setSelected(new Set()); setElapsed(0); setSubStep(0); setNonce((n) => n + 1); };

  const availableIdxs = prereqs.map((_, i) => i).filter((i) => !added.has(i));
  const allSelected = availableIdxs.length > 0 && availableIdxs.every((i) => selected.has(i));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(availableIdxs));

  const addOne = async (idx: number) => {
    const p = prereqs[idx];
    if (!p) return;
    setAdding(idx);
    try {
      await graphHttp.addMissingPrerequisite(grafoId, p.nome, p.tipo, p.shouldConnectTo.map((n) => n.id));
      toast.success(`"${p.nome}" adicionado ao grafo.`);
      setAdded((prev) => new Set([...prev, idx]));
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar nó.");
    } finally {
      setAdding(null);
    }
  };

  const addSelected = async () => {
    const toAdd = [...selected].filter((i) => !added.has(i));
    if (!toAdd.length) return;
    setStep("adding");
    const results = await Promise.allSettled(toAdd.map((i) => addPrereqAt(i)));
    finishAddSelected(results);
  };

  const addPrereqAt = async (i: number): Promise<number> => {
    const p = prereqs[i];
    await graphHttp.addMissingPrerequisite(grafoId, p.nome, p.tipo, p.shouldConnectTo.map((n) => n.id));
    return i;
  };

  const finishAddSelected = (results: Array<PromiseSettledResult<number>>) => {
    const succeeded = new Set<number>();
    let failCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") succeeded.add(r.value);
      else failCount++;
    }
    setAdded((prev) => new Set([...prev, ...succeeded]));
    setSelected(new Set());
    setStep("results");
    if (succeeded.size) { onAdded(); toast.success(`${succeeded.size} pré-requisito(s) adicionado(s) ao grafo.`); }
    if (failCount) toast.error(`${failCount} item(ns) falhou(ram) ao ser adicionado(s).`);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && (step === "loading" || step === "adding")) return;
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <GitBranchIcon className="size-4 text-primary" />
            Pré-requisitos faltantes
          </DialogTitle>
          <DialogDescription>
            A IA analisou o grafo e detectou conceitos que deveriam existir como pré-requisitos mas ainda não estão presentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2">
          <PrereqsBody
            step={step}
            elapsed={elapsed}
            subStep={subStep}
            errorMsg={errorMsg}
            prereqs={prereqs}
            list={{
              prereqs,
              added,
              adding,
              selected,
              availableCount: availableIdxs.length,
              allSelected,
              onToggleAll: toggleAll,
              onToggleSelect: (i) => setSelected((prev) => toggleNum(prev, i)),
              onAdd: addOne,
            }}
            onRetry={retry}
          />
        </div>

        <Separator className="my-3 shrink-0" />
        <PrereqFooter step={step} hasPrereqs={prereqs.length > 0} selectedCount={selected.size} onRetry={retry} onAddSelected={addSelected} onClose={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PrereqsBody({ step, elapsed, subStep, errorMsg, prereqs, list, onRetry }: { step: Step; elapsed: number; subStep: number; errorMsg: string; prereqs: MissingPrereq[]; list: PrereqListProps; onRetry: () => void }) {
  if (step === "loading") return <LoadingView elapsed={elapsed} subStep={subStep} />;
  if (step === "error") return <ErrorView message={errorMsg} onRetry={onRetry} />;
  if (prereqs.length === 0) return <EmptyView />;
  if (step === "adding") return <AddingView elapsed={elapsed} />;
  return <PrereqList {...list} />;
}

function LoadingView({ elapsed, subStep }: { elapsed: number; subStep: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Detectando pré-requisitos com IA" sublabel={ANALYSIS_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={2} label="Apresentar sugestões" status="pending" />
      {elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">A IA está processando — modelos locais podem levar 1-2 minutos.</p>
      )}
    </div>
  );
}

function AddingView({ elapsed }: { elapsed: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Analisando pré-requisitos" status="done" />
      <AiStepRow index={2} label="Adicionando ao grafo" sublabel="Criando nós e conexões..." status="active" elapsed={elapsed} />
      <AiStepRow index={3} label="Concluído" status="pending" />
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function EmptyView() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <CheckIcon className="size-10 text-emerald-500" />
      <p className="text-sm font-medium">Nenhum pré-requisito faltante detectado!</p>
      <p className="text-xs text-muted-foreground">O grafo parece ter uma base de conhecimento bem estruturada.</p>
    </div>
  );
}

interface PrereqListProps {
  prereqs: MissingPrereq[];
  added: Set<number>;
  adding: number | null;
  selected: Set<number>;
  availableCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleSelect: (i: number) => void;
  onAdd: (i: number) => void;
}

function PrereqList(props: PrereqListProps) {
  return (
    <>
      {props.availableCount > 0 && (
        <div className="flex items-center justify-between px-0.5 pb-1">
          <p className="text-xs text-muted-foreground">
            {props.selected.size > 0 ? `${props.selected.size} selecionado(s)` : "Selecione para adicionar em massa"}
          </p>
          <button type="button" className="text-xs text-primary hover:underline" onClick={props.onToggleAll}>
            {props.allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>
      )}
      {props.prereqs.map((p, i) => (
        <PrereqCard
          key={i}
          prereq={p}
          isAdded={props.added.has(i)}
          isAdding={props.adding === i}
          isSelected={props.selected.has(i)}
          onToggleSelect={() => props.onToggleSelect(i)}
          onAdd={() => props.onAdd(i)}
        />
      ))}
    </>
  );
}

interface PrereqCardProps {
  prereq: MissingPrereq;
  isAdded: boolean;
  isAdding: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAdd: () => void;
}

function PrereqCard({ prereq: p, isAdded, isAdding, isSelected, onToggleSelect, onAdd }: PrereqCardProps) {
  const color = TIPO_COLORS[p.tipo] ?? "#6366f1";
  const cls = isAdded ? "border-emerald-500/40 bg-emerald-500/5" : isSelected ? "border-primary/40 bg-primary/5" : "border-border";
  return (
    <div className={`rounded-lg border p-3 space-y-1.5 transition-colors ${cls}`}>
      <div className="flex items-start gap-2">
        {!isAdded && (
          <div className="mt-0.5 shrink-0">
            <GapCheckButton label={p.nome} checked={isSelected} onChange={onToggleSelect} />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0" style={{ borderColor: color + "80", color }}>
              {p.tipo.toLowerCase()}
            </Badge>
            <span className="text-sm font-semibold">{p.nome}</span>
          </div>
          {p.motivo && <p className="text-xs text-muted-foreground">{p.motivo}</p>}
          {p.shouldConnectTo.length > 0 && (
            <p className="text-[11px] text-muted-foreground">Pré-requisito de: {p.shouldConnectTo.map((n) => n.nome).join(", ")}</p>
          )}
        </div>
        <AddButton isAdded={isAdded} isAdding={isAdding} onAdd={onAdd} />
      </div>
    </div>
  );
}

function AddButton({ isAdded, isAdding, onAdd }: { isAdded: boolean; isAdding: boolean; onAdd: () => void }) {
  return (
    <Button
      size="sm"
      variant={isAdded ? "ghost" : "outline"}
      className={`shrink-0 gap-1.5 h-7 ${isAdded ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      disabled={isAdded || isAdding}
      onClick={onAdd}
    >
      {isAdding ? <Loader2Icon className="size-3.5 animate-spin" /> : isAdded ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      {isAdded ? "Adicionado" : isAdding ? "..." : "Adicionar"}
    </Button>
  );
}

function GapCheckButton({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-all ${checked ? "border-primary bg-primary/15" : "border-muted-foreground/30 hover:border-primary/50"}`}
    >
      {checked && <CheckIcon className="size-2.5 text-primary" />}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function PrereqFooter({ step, hasPrereqs, selectedCount, onRetry, onAddSelected, onClose }: { step: Step; hasPrereqs: boolean; selectedCount: number; onRetry: () => void; onAddSelected: () => void; onClose: () => void }) {
  return (
    <div className="shrink-0 flex gap-2">
      {(step === "loading" || step === "adding") && (
        <Button className="flex-1" variant="secondary" disabled>
          <Loader2Icon className="size-4 mr-2 animate-spin" />
          Analisando pré-requisitos…
        </Button>
      )}
      {step === "results" && hasPrereqs && (
        <>
          <Button variant="outline" className="gap-2" onClick={onRetry}>
            <RefreshCwIcon className="size-4" />
            Regerar
          </Button>
          <Button className="flex-1 gap-2" onClick={onAddSelected} disabled={selectedCount === 0}>
            <SparklesIcon className="size-4" />
            Adicionar selecionados ({selectedCount})
          </Button>
        </>
      )}
      {step === "results" && !hasPrereqs && (
        <Button className="flex-1" variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      )}
      {step === "error" && (
        <>
          <Button variant="outline" className="gap-2" onClick={onRetry}>
            <RefreshCwIcon className="size-4" />
            Tentar novamente
          </Button>
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </>
      )}
    </div>
  );
}
