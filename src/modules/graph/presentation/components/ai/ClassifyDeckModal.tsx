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
import { Loader2Icon, TagsIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type {
  ClassificationConcept,
  DeckClassificationChunk,
} from "@/modules/graph/application/ports/graph-ai.port";
import {
  chunkProgressLabel,
  filterPlanToConcepts,
} from "@/modules/graph/presentation/services/classification-review";

interface ClassifyDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  baralhoId: string;
  /** Chamado ao fechar depois de pelo menos um lote aplicado (undo + refresh). */
  onApplied: () => void;
}

type Step = "loading" | "review" | "applying" | "done" | "error";

// Lote pequeno o suficiente para caber no prompt e ser revisável de uma vez.
const CHUNK_SIZE = 30;

interface AppliedTotals {
  lotes: number;
  conceitos: number;
  linkedCards: number;
}

const NO_TOTALS: AppliedTotals = { lotes: 0, conceitos: 0, linkedCards: 0 };

function toggleIndex(prev: Set<number>, i: number): Set<number> {
  const next = new Set(prev);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

export function ClassifyDeckModal({ open, onOpenChange, grafoId, baralhoId, onApplied }: ClassifyDeckModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [chunk, setChunk] = useState<DeckClassificationChunk | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [totals, setTotals] = useState<AppliedTotals>(NO_TOTALS);
  const [errorMsg, setErrorMsg] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Reseta ao abrir (durante o render — não é setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("loading");
      setChunk(null);
      setSelected(new Set());
      setTotals(NO_TOTALS);
      setErrorMsg("");
    }
  }

  const receiveChunk = (res: DeckClassificationChunk) => {
    setChunk(res);
    if (res.plan === null) {
      setStep("done");
      return;
    }
    setSelected(new Set(res.plan.conceitos.map((_, i) => i)));
    setStep("review");
  };

  // O step "loading" é definido por quem dispara o (re)planejamento — abrir o
  // modal (reset no render), aplicar um lote ou tentar de novo — nunca aqui.
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .planDeckClassificationChunk(grafoId, baralhoId, CHUNK_SIZE)
      .then((res) => { if (!ignore) receiveChunk(res); })
      .catch((e) => {
        if (ignore) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao planejar o lote.");
        setStep("error");
      });
    return () => { ignore = true; };
  }, [open, grafoId, baralhoId, nonce]);

  const apply = async () => {
    if (!chunk?.plan || selected.size === 0) return;
    setStep("applying");
    try {
      const filtered = filterPlanToConcepts(chunk.plan, selected);
      const res = await graphHttp.applyDeckClassificationChunk(grafoId, baralhoId, filtered);
      setTotals((t) => ({
        lotes: t.lotes + 1,
        conceitos: t.conceitos + res.conceitos,
        linkedCards: t.linkedCards + res.linkedCards,
      }));
      toast.success(`Lote aplicado: ${res.linkedCards} card(s) em conceito(s).`);
      setStep("loading");
      setNonce((n) => n + 1); // planeja o próximo lote
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar o lote.");
      setStep("review");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && (step === "loading" || step === "applying")) return;
    if (!o && totals.lotes > 0) onApplied();
    onOpenChange(o);
  };

  const retry = () => { setStep("loading"); setNonce((n) => n + 1); };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <TagsIcon className="size-4 text-primary" />
            Classificar acervo do baralho
          </DialogTitle>
          <DialogDescription>
            A IA mapeia os flashcards ainda sem conceito em lotes de {CHUNK_SIZE}. Revise cada
            lote antes de gravar — cards já classificados nunca entram de novo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <ClassifyDeckBody
            step={step}
            chunk={chunk}
            totals={totals}
            errorMsg={errorMsg}
            onRetry={retry}
            selected={selected}
            onToggle={(i) => setSelected((prev) => toggleIndex(prev, i))}
          />
        </div>

        <ClassifyDeckFooter step={step} selectedCount={selected.size} onApply={apply} />
      </DialogContent>
    </Dialog>
  );
}

interface ClassifyDeckBodyProps {
  step: Step;
  chunk: DeckClassificationChunk | null;
  totals: AppliedTotals;
  errorMsg: string;
  onRetry: () => void;
  selected: Set<number>;
  onToggle: (i: number) => void;
}

function ClassifyDeckBody(props: ClassifyDeckBodyProps) {
  if (props.step === "loading") return <LoadingView label="Planejando lote com IA..." />;
  if (props.step === "applying") return <LoadingView label="Gravando lote no grafo..." />;
  if (props.step === "error") return <ErrorView message={props.errorMsg} onRetry={props.onRetry} />;
  if (props.step === "done") return <DoneView chunk={props.chunk} totals={props.totals} />;
  if (!props.chunk?.plan) return null;
  return (
    <div className="space-y-2">
      <ChunkProgress chunk={props.chunk} />
      <Separator className="my-2" />
      {props.chunk.plan.conceitos.map((c, i) => (
        <ConceptRow key={i} concept={c} checked={props.selected.has(i)} onToggle={() => props.onToggle(i)} />
      ))}
    </div>
  );
}

function ChunkProgress({ chunk }: { chunk: DeckClassificationChunk }) {
  const pct = chunk.totalCards > 0 ? Math.round((chunk.classifiedCards / chunk.totalCards) * 100) : 0;
  return (
    <div className="px-1 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{chunk.baralhoNome}</span>
        <span className="text-muted-foreground">
          {chunkProgressLabel(chunk.totalCards, chunk.classifiedCards, CHUNK_SIZE)} · {chunk.classifiedCards}/{chunk.totalCards} cards classificados
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Este lote: {chunk.chunkCards.length} card(s). Desmarque os conceitos que não quiser gravar.
      </p>
    </div>
  );
}

function ConceptRow({ concept: c, checked, onToggle }: { concept: ClassificationConcept; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-md border p-2.5 text-xs transition-all ${checked ? "border-primary/60 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
        <input type="checkbox" checked={checked} onChange={onToggle} onClick={(e) => e.stopPropagation()} className="size-3 shrink-0 accent-primary" />
        <span className="font-medium">{c.nome}</span>
        <span className="text-muted-foreground font-mono text-[10px] shrink-0">{c.topico}</span>
        <span className="ml-auto text-muted-foreground shrink-0">{c.flashcardIds.length} card(s)</span>
      </div>
      {c.descricao && <p className="text-muted-foreground pl-5 leading-relaxed">{c.descricao}</p>}
    </button>
  );
}

function ClassifyDeckFooter({ step, selectedCount, onApply }: { step: Step; selectedCount: number; onApply: () => void }) {
  if (step === "review") {
    return (
      <>
        <Separator className="my-3 shrink-0" />
        <div className="shrink-0">
          <Button className="w-full gap-2" onClick={onApply} disabled={selectedCount === 0}>
            <TagsIcon className="size-4" />
            Aplicar lote ({selectedCount} conceito(s)) e continuar
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
            Classificando o baralho…
          </Button>
        </div>
      </>
    );
  }
  return null;
}

function LoadingView({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function DoneView({ chunk, totals }: { chunk: DeckClassificationChunk | null; totals: AppliedTotals }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <CheckCircle2Icon className="size-10 text-emerald-500" />
      <p className="text-sm font-medium">
        Acervo classificado: {chunk ? `${chunk.classifiedCards}/${chunk.totalCards} cards` : "tudo em dia"}!
      </p>
      {totals.lotes > 0 && (
        <p className="text-xs text-muted-foreground">
          Nesta sessão: {totals.lotes} lote(s), {totals.conceitos} conceito(s) novo(s), {totals.linkedCards} card(s) ligado(s).
        </p>
      )}
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
