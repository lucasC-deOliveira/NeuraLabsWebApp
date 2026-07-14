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
import { QuestaoFace, type QuestaoAlternativa } from "@/components/questao/QuestaoFace";
import type { ImproveFlashcardOperation, ImprovedQuestao } from "@/modules/graph/application/ports/graph-ai.port";
import type { QuestaoView } from "@/modules/graph/application/ports/graph-prova.port";
import { DEFAULT_IMPROVE_OPS } from "./improve-ops";
import { ImproveFooter, ImproveLoadingRow, ImproveOptions } from "./improve-parts";

interface ImproveQuestaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questaoId: string | null;
  onApplied: () => void;
}

type Questao = { tipo: string; enunciado: string; alternativas: QuestaoAlternativa[]; gabarito: string; explicacao: string };

function toQuestao(q: QuestaoView): Questao {
  return {
    tipo: q.tipo,
    enunciado: q.enunciado,
    alternativas: q.alternativas ?? [],
    gabarito: q.gabarito,
    explicacao: q.explicacao ?? "",
  };
}

export function ImproveQuestaoModal({ open, onOpenChange, questaoId, onApplied }: ImproveQuestaoModalProps) {
  const [loading, setLoading] = useState(true);
  const [original, setOriginal] = useState<Questao | null>(null);
  const [ops, setOps] = useState<Set<ImproveFlashcardOperation>>(new Set(DEFAULT_IMPROVE_OPS));
  const [improving, setImproving] = useState(false);
  const [result, setResult] = useState<ImprovedQuestao | null>(null);
  const [applying, setApplying] = useState(false);
  const [prevKey, setPrevKey] = useState("");

  const loadKey = open && questaoId ? questaoId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setOriginal(null); setResult(null); setImproving(false); setOps(new Set(DEFAULT_IMPROVE_OPS)); }
  }

  useEffect(() => {
    if (!open || !questaoId) return;
    let active = true;
    graphHttp
      .getQuestao(questaoId)
      .then((q) => { if (active) setOriginal(q ? toQuestao(q) : null); })
      .catch(() => { if (active) setOriginal(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, questaoId]);

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
      setResult(await graphHttp.improveQuestao({ ...original, operations: [...ops] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao melhorar a questão.");
    } finally {
      setImproving(false);
    }
  };

  const apply = async () => {
    if (!result || !questaoId) return;
    setApplying(true);
    try {
      await graphHttp.updateQuestao(questaoId, {
        enunciado: result.enunciado,
        alternativas: result.alternativas,
        explicacao: result.explicacao,
      });
      toast.success("Questão atualizada com a versão melhorada.");
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a questão.");
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
            Melhorar questão com IA
          </DialogTitle>
          <DialogDescription>
            Preserva o gabarito e as alternativas. A IA reescreve em markdown e você revisa antes de aplicar.
          </DialogDescription>
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
  original: Questao | null;
  improving: boolean;
  result: ImprovedQuestao | null;
  ops: Set<ImproveFlashcardOperation>;
  onToggle: (id: ImproveFlashcardOperation) => void;
}) {
  if (loading) return <ImproveLoadingRow text="Carregando a questão..." />;
  if (!original) return <p className="py-8 text-center text-sm text-muted-foreground">Não foi possível carregar esta questão.</p>;
  if (improving) return <ImproveLoadingRow text="Melhorando com IA..." />;
  if (result) return <ResultView original={original} result={result} />;
  return <ImproveOptions ops={ops} onToggle={onToggle} />;
}

function ResultView({ original, result }: { original: Questao; result: ImprovedQuestao }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const shown: Questao = showOriginal
    ? original
    : { tipo: original.tipo, enunciado: result.enunciado, alternativas: result.alternativas, gabarito: original.gabarito, explicacao: result.explicacao };
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
      <QuestaoFace
        tipo={shown.tipo}
        enunciado={shown.enunciado}
        alternativas={shown.alternativas}
        gabarito={shown.gabarito}
        explicacao={shown.explicacao}
      />
    </div>
  );
}
