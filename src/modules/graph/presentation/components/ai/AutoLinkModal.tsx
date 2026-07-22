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
import { Loader2Icon, Link2Icon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { AutoLinkSuggestion } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

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

function toggleIndex(prev: Set<number>, i: number): Set<number> {
  const next = new Set(prev);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

export function AutoLinkModal({ open, onOpenChange, grafoId, onApplied }: AutoLinkModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [suggestions, setSuggestions] = useState<AutoLinkSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Reseta ao abrir (durante o render — não é setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("loading");
      setSelected(new Set());
      setErrorMsg("");
      setElapsed(0);
      setSubStep(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .autoLinkGraph(grafoId)
      .then((res) => {
        if (ignore) return;
        setSuggestions(res.suggestions);
        setSelected(new Set(res.suggestions.map((_, i) => i)));
        setStep("results");
      })
      .catch((e) => {
        if (ignore) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao analisar o grafo.");
        setStep("error");
      });
    return () => { ignore = true; };
  }, [open, grafoId, nonce]);

  useEffect(() => {
    if (step !== "loading") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const stepTimer = setInterval(() => setSubStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 2500);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [step]);

  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;
  const retry = () => { setStep("loading"); setElapsed(0); setSubStep(0); setNonce((n) => n + 1); };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(suggestions.map((_, i) => i)));

  const apply = async () => {
    const edges = suggestions.filter((_, i) => selected.has(i)).map((s) => ({ sourceId: s.sourceId, targetId: s.targetId, relacao: s.relacao }));
    if (!edges.length) return;
    setStep("applying");
    try {
      const { added } = await graphHttp.applyAutoLink(grafoId, edges);
      toast.success(`${added} relação(ões) adicionada(s).`);
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar relações.");
      setStep("results");
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
          <AutoLinkBody
            step={step}
            elapsed={elapsed}
            subStep={subStep}
            errorMsg={errorMsg}
            onRetry={retry}
            suggestions={suggestions}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onToggle={(i) => setSelected((prev) => toggleIndex(prev, i))}
          />
        </div>

        <AutoLinkFooter step={step} suggestionCount={suggestions.length} selectedCount={selected.size} onApply={apply} />
      </DialogContent>
    </Dialog>
  );
}

interface AutoLinkBodyProps {
  step: Step;
  elapsed: number;
  subStep: number;
  errorMsg: string;
  onRetry: () => void;
  suggestions: AutoLinkSuggestion[];
  selected: Set<number>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (i: number) => void;
}

function AutoLinkBody(props: AutoLinkBodyProps) {
  if (props.step === "loading") return <LoadingView elapsed={props.elapsed} subStep={props.subStep} />;
  if (props.step === "applying") return <ApplyingView count={props.selected.size} />;
  if (props.step === "error") return <ErrorView message={props.errorMsg} onRetry={props.onRetry} />;
  if (props.suggestions.length === 0) return <EmptyView />;
  return (
    <SuggestionList
      suggestions={props.suggestions}
      selected={props.selected}
      allSelected={props.allSelected}
      onToggleAll={props.onToggleAll}
      onToggle={props.onToggle}
    />
  );
}

function AutoLinkFooter({ step, suggestionCount, selectedCount, onApply }: { step: Step; suggestionCount: number; selectedCount: number; onApply: () => void }) {
  if (step === "results" && suggestionCount > 0) {
    return (
      <>
        <Separator className="my-3 shrink-0" />
        <div className="shrink-0">
          <Button className="w-full gap-2" onClick={onApply} disabled={selectedCount === 0}>
            <Link2Icon className="size-4" />
            Adicionar selecionadas ({selectedCount})
          </Button>
        </div>
      </>
    );
  }
  if (step === "loading" || step === "applying") {
    return (
      <>
        <Separator className="my-3 shrink-0" />
        <div className="shrink-0">
          <Button className="w-full" variant="secondary" disabled>
            <Loader2Icon className="size-4 mr-2 animate-spin" />
            Sugerindo conexões…
          </Button>
        </div>
      </>
    );
  }
  return null;
}

function LoadingView({ elapsed, subStep }: { elapsed: number; subStep: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Analisando conexões com IA" sublabel={ANALYSIS_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={2} label="Apresentar sugestões" status="pending" />
      {elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
          A IA está processando — modelos locais podem levar 1-2 minutos.
        </p>
      )}
    </div>
  );
}

function ApplyingView({ count }: { count: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Analisando conexões com IA" status="done" />
      <AiStepRow index={2} label="Criando conexões no grafo" sublabel={`Adicionando ${count} relação(ões)...`} status="active" />
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
      <CheckCircle2Icon className="size-10 text-emerald-500" />
      <p className="text-sm font-medium">O grafo já está bem conectado!</p>
      <p className="text-xs text-muted-foreground">Nenhuma relação adicional foi sugerida.</p>
    </div>
  );
}

interface SuggestionListProps {
  suggestions: AutoLinkSuggestion[];
  selected: Set<number>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (i: number) => void;
}

function SuggestionList({ suggestions, selected, allSelected, onToggleAll, onToggle }: SuggestionListProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 pb-2">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="size-3.5 cursor-pointer accent-primary" />
        <span className="text-xs text-muted-foreground">Selecionar todos ({suggestions.length})</span>
      </div>
      <Separator className="mb-2" />
      {suggestions.map((s, i) => (
        <SuggestionRow key={i} suggestion={s} checked={selected.has(i)} onToggle={() => onToggle(i)} />
      ))}
    </div>
  );
}

function SuggestionRow({ suggestion: s, checked, onToggle }: { suggestion: AutoLinkSuggestion; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-md border p-2.5 text-xs transition-all ${checked ? "border-primary/60 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
        <input type="checkbox" checked={checked} onChange={onToggle} onClick={(e) => e.stopPropagation()} className="size-3 shrink-0 accent-primary" />
        <span className="font-medium">{s.sourceNome}</span>
        <span className="text-muted-foreground font-mono text-[10px] shrink-0">→ {s.relacao} →</span>
        <span className="font-medium">{s.targetNome}</span>
      </div>
      {s.motivo && <p className="text-muted-foreground pl-5 leading-relaxed">{s.motivo}</p>}
    </button>
  );
}
