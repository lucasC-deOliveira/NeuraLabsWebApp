import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import type { ImproveFlashcardOperation } from "@/modules/graph/application/ports/graph-ai.port";
import { DEFAULT_IMPROVE_OPS } from "./improve-ops";
import { ImproveFooter, ImproveLoadingRow, ImproveOptions } from "./improve-parts";

interface ImproveFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
  grafoId: string;
  onApplied: () => void;
}

type Content = { pergunta: string; resposta: string };

export function ImproveFlashcardModal({ open, onOpenChange, flashcardId, grafoId, onApplied }: ImproveFlashcardModalProps) {
  const [loading, setLoading] = useState(true);
  const [original, setOriginal] = useState<Content | null>(null);
  const [ops, setOps] = useState<Set<ImproveFlashcardOperation>>(new Set(DEFAULT_IMPROVE_OPS));
  const [improving, setImproving] = useState(false);
  const [result, setResult] = useState<Content | null>(null);
  const [applying, setApplying] = useState(false);
  const [prevKey, setPrevKey] = useState("");

  // reset ao (re)abrir para outro flashcard — durante o render, sem set-state-in-effect
  const loadKey = open && flashcardId ? flashcardId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setOriginal(null); setResult(null); setImproving(false); setOps(new Set(DEFAULT_IMPROVE_OPS)); }
  }

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    graphHttp
      .getNodeDetails("FLASHCARD", flashcardId)
      .then((d) => { if (active) setOriginal(d ? { pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" } : null); })
      .catch(() => { if (active) setOriginal(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, flashcardId]);

  const toggleOp = (id: ImproveFlashcardOperation) =>
    setOps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const improve = async () => {
    if (!original || ops.size === 0) return;
    setImproving(true);
    try {
      setResult(await graphHttp.improveFlashcard({ ...original, operations: [...ops] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao melhorar o flashcard.");
    } finally {
      setImproving(false);
    }
  };

  const apply = async () => {
    if (!result || !flashcardId) return;
    setApplying(true);
    try {
      await graphHttp.updateGraphNode("FLASHCARD", flashcardId, { pergunta: result.pergunta, resposta: result.resposta }, grafoId);
      toast.success("Flashcard atualizado com a versão melhorada.");
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar o flashcard.");
    } finally {
      setApplying(false);
    }
  };

  const busy = improving || applying;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && busy) return; onOpenChange(o); }}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-violet-500" />
            Melhorar flashcard com IA
          </DialogTitle>
          <DialogDescription>Escolha o que melhorar. A IA reescreve em markdown e você revisa antes de aplicar.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <Body loading={loading} original={original} improving={improving} result={result} ops={ops} onToggle={toggleOp} />
        </div>

        {original && !loading && (
          <ImproveFooter
            hasResult={!!result}
            improving={improving}
            applying={applying}
            canImprove={ops.size > 0}
            onAdjust={() => setResult(null)}
            onImprove={improve}
            onApply={apply}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({ loading, original, improving, result, ops, onToggle }: {
  loading: boolean;
  original: Content | null;
  improving: boolean;
  result: Content | null;
  ops: Set<ImproveFlashcardOperation>;
  onToggle: (id: ImproveFlashcardOperation) => void;
}) {
  if (loading) return <ImproveLoadingRow text="Carregando o flashcard..." />;
  if (!original) return <p className="py-8 text-center text-sm text-muted-foreground">Não foi possível carregar este flashcard.</p>;
  if (improving) return <ImproveLoadingRow text="Melhorando com IA..." />;
  if (result) return <ResultView original={original} result={result} />;
  return <ImproveOptions ops={ops} onToggle={onToggle} />;
}

function ResultView({ original, result }: { original: Content; result: Content }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const shown = showOriginal ? original : result;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {showOriginal ? "Original" : "Melhorado pela IA"}
        </span>
        <button onClick={() => setShowOriginal((v) => !v)} className="text-[11px] text-primary hover:underline">
          {showOriginal ? "Ver melhorado" : "Comparar com original"}
        </button>
      </div>
      <FlashcardFace pergunta={shown.pergunta} resposta={shown.resposta} showAnswer />
    </div>
  );
}
