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
import { Loader2Icon, WaypointsIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { BridgeSuggestion } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

interface BridgesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onApplied: () => void;
}

type Step = "loading" | "results" | "applying" | "error";

const ANALYSIS_STEPS = [
  "Vetorizando conceitos deste grafo...",
  "Comparando com os conceitos dos outros grafos...",
  "Selecionando os pares mais próximos...",
  "Pedindo à IA para nomear (ou recusar) cada ponte...",
  "Finalizando análise...",
];

function toggleIndex(prev: Set<number>, i: number): Set<number> {
  const next = new Set(prev);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

export function BridgesModal({ open, onOpenChange, grafoId, onApplied }: BridgesModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [suggestions, setSuggestions] = useState<BridgeSuggestion[]>([]);
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
      .suggestBridges(grafoId)
      .then((res) => {
        if (ignore) return;
        setSuggestions(res.suggestions);
        setSelected(new Set(res.suggestions.map((_, i) => i)));
        setStep("results");
      })
      .catch((e) => {
        if (ignore) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao buscar pontes.");
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
    const edges = suggestions
      .filter((_, i) => selected.has(i))
      .map((s) => ({ sourceId: s.sourceId, targetId: s.targetId, relacao: s.relacao }));
    if (!edges.length) return;
    setStep("applying");
    try {
      // Uma ponte é uma aresta: grava pelo mesmo endpoint do auto-link.
      const { added } = await graphHttp.applyAutoLink(grafoId, edges);
      toast.success(`${added} ponte(s) criada(s) entre grafos.`);
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar as pontes.");
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
            <WaypointsIcon className="size-4 text-primary" />
            Pontes entre grafos
          </DialogTitle>
          <DialogDescription>
            Conceitos deste grafo que se aproximam de conceitos de OUTROS grafos e ainda não
            estão ligados. A IA recusa os pares que só se parecem na escrita.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <BridgesBody
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

        <BridgesFooter
          step={step}
          suggestionCount={suggestions.length}
          selectedCount={selected.size}
          onApply={apply}
        />
      </DialogContent>
    </Dialog>
  );
}

interface BridgesBodyProps {
  step: Step;
  elapsed: number;
  subStep: number;
  errorMsg: string;
  onRetry: () => void;
  suggestions: BridgeSuggestion[];
  selected: Set<number>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (i: number) => void;
}

function BridgesBody(props: BridgesBodyProps) {
  if (props.step === "loading") return <LoadingView elapsed={props.elapsed} subStep={props.subStep} />;
  if (props.step === "applying") return <ApplyingView count={props.selected.size} />;
  if (props.step === "error") return <ErrorView message={props.errorMsg} onRetry={props.onRetry} />;
  if (props.suggestions.length === 0) return <EmptyView />;
  return (
    <BridgeList
      suggestions={props.suggestions}
      selected={props.selected}
      allSelected={props.allSelected}
      onToggleAll={props.onToggleAll}
      onToggle={props.onToggle}
    />
  );
}

function BridgesFooter({ step, suggestionCount, selectedCount, onApply }: { step: Step; suggestionCount: number; selectedCount: number; onApply: () => void }) {
  if (step === "results" && suggestionCount > 0) {
    return (
      <>
        <Separator className="my-3 shrink-0" />
        <div className="shrink-0">
          <Button className="w-full gap-2" onClick={onApply} disabled={selectedCount === 0}>
            <WaypointsIcon className="size-4" />
            Criar pontes selecionadas ({selectedCount})
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
            Processando...
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
      <AiStepRow index={1} label="Procurando pontes entre grafos" sublabel={ANALYSIS_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={2} label="Apresentar pontes" status="pending" />
    </div>
  );
}

function ApplyingView({ count }: { count: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Procurando pontes entre grafos" status="done" />
      <AiStepRow index={2} label="Criando pontes no grafo" sublabel={`Adicionando ${count} aresta(s)...`} status="active" />
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
      <p className="text-sm font-medium">Nenhuma ponte nova encontrada.</p>
      <p className="text-xs text-muted-foreground">
        Ou os grafos já estão conectados, ou os conceitos próximos foram recusados pela IA.
      </p>
    </div>
  );
}

interface BridgeListProps {
  suggestions: BridgeSuggestion[];
  selected: Set<number>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (i: number) => void;
}

function BridgeList({ suggestions, selected, allSelected, onToggleAll, onToggle }: BridgeListProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 pb-2">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="size-3.5 cursor-pointer accent-primary" />
        <span className="text-xs text-muted-foreground">Selecionar todas ({suggestions.length})</span>
      </div>
      <Separator className="mb-2" />
      {suggestions.map((s, i) => (
        <BridgeRow key={i} suggestion={s} checked={selected.has(i)} onToggle={() => onToggle(i)} />
      ))}
    </div>
  );
}

// Mostra de qual grafo vem cada ponta: sem isso o usuário não tem como julgar se
// a ponte faz sentido — é a única informação que distingue isto do auto-link.
function BridgeRow({ suggestion: s, checked, onToggle }: { suggestion: BridgeSuggestion; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-md border p-2.5 text-xs transition-all ${checked ? "border-primary/60 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <input type="checkbox" checked={checked} onChange={onToggle} onClick={(e) => e.stopPropagation()} className="size-3 shrink-0 accent-primary" />
        <span className="font-medium">{s.sourceNome}</span>
        <span className="text-muted-foreground font-mono text-[10px] shrink-0">→ {s.relacao} →</span>
        <span className="font-medium">{s.targetNome}</span>
        <span className="ml-auto text-muted-foreground shrink-0 tabular-nums">
          {Math.round(s.similaridade * 100)}%
        </span>
      </div>
      <div className="pl-5 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground mb-0.5">
        <span className="rounded bg-muted px-1 py-px">{s.sourceGrafoNome}</span>
        <span>↔</span>
        <span className="rounded bg-muted px-1 py-px">{s.targetGrafoNome}</span>
      </div>
      {s.motivo && <p className="text-muted-foreground pl-5 leading-relaxed">{s.motivo}</p>}
    </button>
  );
}
