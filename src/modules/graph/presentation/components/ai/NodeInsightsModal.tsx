import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SparklesIcon, RefreshCwIcon, CheckIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/markdown-content";
import { NODE_TYPE_DISPLAY, RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { graphHttp } from "@/modules/graph/infra/http";
import type { NodeInsight } from "@/modules/graph/application/ports/graph-ai.port";

interface NodeInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  nodeId: string | null;
  nodeLabel?: string;
  onAdded?: () => void;
}

const CATEGORY_STYLE: Record<string, string> = {
  Relacionado: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Aprofundar: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Conexão: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Aplicação: "border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

const tipoLabel = (t: string): string => NODE_TYPE_DISPLAY[t as keyof typeof NODE_TYPE_DISPLAY]?.label ?? t;
const relacaoLabel = (r: string): string => RELATION_LABELS[r] ?? r.toLowerCase();

export function NodeInsightsModal({ open, onOpenChange, grafoId, nodeId, nodeLabel, onAdded }: NodeInsightsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<NodeInsight[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [prevKey, setPrevKey] = useState("");

  const loadKey = `${open}-${nodeId ?? ""}-${reloadKey}`;
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (open && nodeId) { setLoading(true); setError(null); setInsights([]); setSelected(new Set()); }
  }

  useEffect(() => {
    if (!open || !nodeId) return;
    let active = true;
    // reloadKey > 0 significa que o usuário pediu "Gerar de novo" — força ignorar o
    // cache do servidor; a primeira carga (reloadKey 0) reusa o cache se válido.
    graphHttp
      .generateNodeInsights(grafoId, nodeId, reloadKey > 0)
      .then((res) => {
        if (!active) return;
        setInsights(res.insights);
        if (res.insights.length === 0) setError("A IA não encontrou insights para este nó.");
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao gerar insights."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, nodeId, grafoId, reloadKey]);

  const toggle = (i: number) =>
    setSelected((prev) => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });

  const add = async () => {
    if (!nodeId || selected.size === 0) return;
    setAdding(true);
    try {
      const chosen = [...selected].map((i) => insights[i]);
      const res = await graphHttp.addInsightsToGraph(grafoId, nodeId, chosen);
      toast.success(res.added > 0 ? `${res.added} insight(s) adicionado(s) ao grafo.` : "Nada foi adicionado (já existiam no grafo).");
      onAdded?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar ao grafo.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            Insights da IA
          </DialogTitle>
          <DialogDescription>
            Selecione os que você gostou para adicionar ao grafo, ligados a{" "}
            <span className="font-medium text-foreground">{nodeLabel || "este nó"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <InsightsBody
            loading={loading}
            error={error}
            insights={insights}
            selected={selected}
            onToggle={toggle}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        </div>

        {!loading && !error && insights.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setReloadKey((k) => k + 1)} disabled={adding}>
              <RefreshCwIcon className="size-4" />
              Gerar de novo
            </Button>
            <Button className="flex-1 gap-2" onClick={add} disabled={selected.size === 0 || adding}>
              {adding ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
              Adicionar ao grafo{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface InsightsBodyProps {
  loading: boolean;
  error: string | null;
  insights: NodeInsight[];
  selected: Set<number>;
  onToggle: (i: number) => void;
  onRetry: () => void;
}

function InsightsBody({ loading, error, insights, selected, onToggle, onRetry }: InsightsBodyProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        Gerando insights...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RefreshCwIcon className="size-4" />
          Tentar de novo
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} checked={selected.has(i)} onToggle={() => onToggle(i)} />
      ))}
    </div>
  );
}

function InsightCard({ insight: ins, checked, onToggle }: { insight: NodeInsight; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${checked ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "bg-card hover:border-primary/40"}`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
          {checked && <CheckIcon className="size-3" />}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLE[ins.categoria] ?? "border-border bg-muted text-muted-foreground"}`}>
          {ins.categoria}
        </span>
        <h4 className="flex-1 text-sm font-semibold leading-tight">{ins.titulo}</h4>
      </div>
      {ins.descricao && (
        <div className="mt-1.5 pl-6 text-xs text-muted-foreground leading-relaxed">
          <MarkdownContent>{ins.descricao}</MarkdownContent>
        </div>
      )}
      <p className="mt-1.5 pl-6 text-[10px] text-muted-foreground">
        vira <span className="font-medium text-foreground">{tipoLabel(ins.tipoNo)}</span> ·{" "}
        <span className="italic">{relacaoLabel(ins.relacao)}</span>
      </p>
    </button>
  );
}
