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
import {
  Loader2Icon,
  Trash2Icon,
  AlertCircleIcon,
  CopyIcon,
  GitMergeIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { DuplicateGroup } from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

interface DuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onDeleted: () => void;
}

type Step = "loading" | "results" | "done" | "error";
type Confirm = { nodeId: string; groupIdx: number } | null;
type Method = "llm" | "similarity";

// "IA" lê nome+descrição num prompt (rico, mas trunca em grafos grandes);
// "Similaridade" compara embeddings dos nomes (escala, sem limite de prompt).
function runDetect(method: Method, grafoId: string) {
  return method === "similarity"
    ? graphHttp.detectDuplicatesBySimilarity(grafoId)
    : graphHttp.detectDuplicates(grafoId);
}

const TIPO_COLORS: Record<string, string> = { ASSUNTO: "#6366f1", TOPICO: "#0ea5e9", CONCEITO: "#10b981" };
const ANALYSIS_STEPS = [
  "Carregando nós do grafo...",
  "Comparando nomes e descrições...",
  "Detectando equivalências semânticas...",
  "Agrupando candidatos...",
  "Finalizando análise...",
];

function keepMapFor(groups: DuplicateGroup[]): Map<number, string> {
  return new Map(groups.map((g, i) => [i, g.nodes[0]?.id ?? ""]));
}

export function DuplicatesModal({ open, onOpenChange, grafoId, onDeleted }: DuplicatesModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [prevGroups, setPrevGroups] = useState<DuplicateGroup[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Confirm>(null);
  const [merging, setMerging] = useState<Set<number>>(new Set());
  const [mergingAll, setMergingAll] = useState(false);
  const [keepSelection, setKeepSelection] = useState<Map<number, string>>(new Map());
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [method, setMethod] = useState<Method>("llm");

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setStep("loading"); setResolvedCount(0); setConfirmDelete(null); setErrorMsg(""); setElapsed(0); setSubStep(0); }
  }
  // keepSelection é redefinido quando os grupos mudam (durante render, não em effect).
  if (groups !== prevGroups) {
    setPrevGroups(groups);
    setKeepSelection(keepMapFor(groups));
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    runDetect(method, grafoId)
      .then((res) => {
        if (ignore) return;
        setGroups(res.groups);
        setInitialCount(res.groups.length);
        setStep(res.groups.length === 0 ? "done" : "results");
      })
      .catch((e) => {
        if (ignore) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao detectar duplicatas.");
        setStep("error");
      });
    return () => { ignore = true; };
  }, [open, grafoId, nonce, method]);

  useEffect(() => {
    if (step !== "loading") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const stepTimer = setInterval(() => setSubStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 2500);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [step]);

  const retry = () => { setStep("loading"); setResolvedCount(0); setElapsed(0); setSubStep(0); setNonce((n) => n + 1); };
  const switchMethod = (m: Method) => {
    if (m === method) return;
    setMethod(m);
    setStep("loading"); setResolvedCount(0); setElapsed(0); setSubStep(0);
  };
  const busy = mergingAll || merging.size > 0 || !!deleting;

  const removeGroup = (groupIdx: number) => {
    setGroups((prev) => {
      const next = prev.filter((_, i) => i !== groupIdx);
      if (next.length === 0) setStep("done");
      return next;
    });
    setResolvedCount((c) => c + 1);
    onDeleted();
  };

  const merge = async (groupIdx: number) => {
    const g = groups[groupIdx];
    const keepId = keepSelection.get(groupIdx) ?? g.nodes[0]?.id;
    const deleteIds = keepId ? g.nodes.filter((n) => n.id !== keepId).map((n) => n.id) : [];
    if (!keepId || !deleteIds.length) return;
    setMerging((prev) => new Set(prev).add(groupIdx));
    try {
      const res = await graphHttp.mergeDuplicates(grafoId, keepId, deleteIds);
      toast.success(`Mesclado: ${res.merged} nó(s) removido(s), ${res.edgesMoved} aresta(s) migrada(s).`);
      removeGroup(groupIdx);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mesclar nós.");
    } finally {
      setMerging((prev) => { const next = new Set(prev); next.delete(groupIdx); return next; });
    }
  };

  const mergeAll = async () => {
    setMergingAll(true);
    let merged = 0;
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const g = groups[gi];
      const keepId = keepSelection.get(gi) ?? g.nodes[0]?.id;
      const deleteIds = keepId ? g.nodes.filter((n) => n.id !== keepId).map((n) => n.id) : [];
      if (keepId && deleteIds.length && (await tryMerge(keepId, deleteIds))) merged++;
    }
    setMergingAll(false);
    finishMergeAll(merged);
  };

  const tryMerge = async (keepId: string, deleteIds: string[]): Promise<boolean> => {
    try {
      await graphHttp.mergeDuplicates(grafoId, keepId, deleteIds);
      return true;
    } catch {
      return false;
    }
  };

  const finishMergeAll = (merged: number) => {
    if (merged === 0) return void toast.error("Nenhum grupo pôde ser mesclado.");
    toast.success(`${merged} grupo(s) mesclado(s) com sucesso.`);
    setGroups([]);
    setResolvedCount((c) => c + merged);
    setStep("done");
    onDeleted();
  };

  const confirmDeleteNode = async () => {
    if (!confirmDelete) return;
    const { nodeId, groupIdx } = confirmDelete;
    const g = groups[groupIdx];
    const node = g?.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setConfirmDelete(null);
    setDeleting(nodeId);
    try {
      await graphHttp.deleteGraphNode(nodeId, grafoId);
      toast.success(`"${node.nome}" excluído.`);
      applyDeletion(g, groupIdx, nodeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir nó.");
    } finally {
      setDeleting(null);
    }
  };

  const applyDeletion = (g: DuplicateGroup, groupIdx: number, nodeId: string) => {
    const remaining = g.nodes.filter((n) => n.id !== nodeId);
    if (remaining.length < 2) return removeGroup(groupIdx);
    setGroups((prev) => prev.map((cur, i) => (i === groupIdx ? { ...g, nodes: remaining } : cur)));
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && busy) return; onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <CopyIcon className="size-4 text-primary" />
            Detecção de duplicatas
          </DialogTitle>
          <DialogDescription>Agrupa nós semanticamente equivalentes para você decidir quais manter.</DialogDescription>
          <MethodToggle method={method} disabled={busy || step === "loading"} onChange={switchMethod} />
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
          {step === "loading" && <LoadingView elapsed={elapsed} subStep={subStep} />}
          {step === "error" && <ErrorView message={errorMsg} onRetry={retry} />}
          {step === "done" && <DoneView initialCount={initialCount} resolvedCount={resolvedCount} onRetry={retry} />}
          {step === "results" && (
            <ResultsView
              groups={groups}
              keepSelection={keepSelection}
              merging={merging}
              mergingAll={mergingAll}
              deleting={deleting}
              confirmDelete={confirmDelete}
              resolvedCount={resolvedCount}
              busy={busy}
              onSetKeep={(gi, id) => { setConfirmDelete(null); setKeepSelection((prev) => new Map(prev).set(gi, id)); }}
              onAskDelete={setConfirmDelete}
              onConfirmDelete={confirmDeleteNode}
              onMerge={merge}
              onMergeAll={mergeAll}
            />
          )}
        </div>

        {step === "loading" && (
          <>
            <Separator className="my-3 shrink-0" />
            <div className="shrink-0">
              <Button className="w-full" variant="secondary" disabled>
                <Loader2Icon className="size-4 mr-2 animate-spin" />
                Procurando duplicatas…
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodToggle({ method, disabled, onChange }: { method: Method; disabled: boolean; onChange: (m: Method) => void }) {
  const opt = (m: Method, label: string, hint: string) => (
    <button
      onClick={() => onChange(m)}
      disabled={disabled}
      title={hint}
      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${method === m ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mt-2 flex gap-1 rounded-lg border border-border p-0.5">
      {opt("llm", "IA", "Embeddings acham os candidatos; a IA confirma só os ambíguos. Preciso e econômico em tokens.")}
      {opt("similarity", "Similaridade", "Só embeddings dos nomes, sem IA — 0 token, escala para grafos grandes.")}
    </div>
  );
}

function LoadingView({ elapsed, subStep }: { elapsed: number; subStep: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Analisando nós com IA" sublabel={ANALYSIS_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={2} label="Apresentar resultados" status="pending" />
      {elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
          A IA está processando — modelos locais podem levar 1-2 minutos.
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

function DoneView({ initialCount, resolvedCount, onRetry }: { initialCount: number; resolvedCount: number; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <ShieldCheckIcon className="size-12 text-emerald-500" />
      <p className="text-base font-semibold">{initialCount === 0 ? "Nenhuma duplicata encontrada!" : "Todos os grupos resolvidos!"}</p>
      <p className="text-xs text-muted-foreground">
        {initialCount === 0 ? "Todos os nós parecem semanticamente distintos." : `${resolvedCount} grupo(s) resolvido(s). O grafo está limpo.`}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
        Verificar novamente
      </Button>
    </div>
  );
}

interface ResultsViewProps {
  groups: DuplicateGroup[];
  keepSelection: Map<number, string>;
  merging: Set<number>;
  mergingAll: boolean;
  deleting: string | null;
  confirmDelete: Confirm;
  resolvedCount: number;
  busy: boolean;
  onSetKeep: (gi: number, id: string) => void;
  onAskDelete: (c: Confirm) => void;
  onConfirmDelete: () => void;
  onMerge: (gi: number) => void;
  onMergeAll: () => void;
}

function ResultsView(props: ResultsViewProps) {
  const { groups, resolvedCount, mergingAll, busy, onMergeAll } = props;
  return (
    <>
      <div className="flex items-center justify-between px-0.5 pb-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {groups.length} grupo{groups.length !== 1 ? "s" : ""}
          </Badge>
          {resolvedCount > 0 && (
            <span className="text-xs text-emerald-600 font-medium">· {resolvedCount} resolvido{resolvedCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        {groups.length > 1 && (
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-7" disabled={busy} onClick={onMergeAll}>
            {mergingAll ? <Loader2Icon className="size-3 animate-spin" /> : <GitMergeIcon className="size-3" />}
            Mesclar todos
          </Button>
        )}
      </div>
      <Separator />
      {groups.map((g, gi) => (
        <DuplicateGroupCard key={gi} group={g} groupIdx={gi} {...props} />
      ))}
    </>
  );
}

function DuplicateGroupCard({ group, groupIdx, ...p }: ResultsViewProps & { group: DuplicateGroup; groupIdx: number }) {
  const keepId = p.keepSelection.get(groupIdx) ?? group.nodes[0]?.id;
  const isMerging = p.merging.has(groupIdx);
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      {group.sugestao && <p className="text-xs text-muted-foreground leading-relaxed">{group.sugestao}</p>}
      <div className="flex flex-wrap gap-2">
        {group.nodes.map((n) => (
          <NodeChip
            key={n.id}
            node={n}
            isKeep={keepId === n.id}
            confirming={p.confirmDelete?.nodeId === n.id && p.confirmDelete.groupIdx === groupIdx}
            deleting={p.deleting}
            disabled={isMerging || p.mergingAll}
            onSetKeep={() => p.onSetKeep(groupIdx, n.id)}
            onAskDelete={() => p.onAskDelete({ nodeId: n.id, groupIdx })}
            onConfirmDelete={p.onConfirmDelete}
            onCancel={() => p.onAskDelete(null)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <p className="text-[11px] text-muted-foreground">Clique num nó para marcá-lo como principal.</p>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" disabled={isMerging || !!p.deleting || p.mergingAll} onClick={() => p.onMerge(groupIdx)}>
          {isMerging ? <Loader2Icon className="size-3 animate-spin" /> : <GitMergeIcon className="size-3" />}
          Mesclar
        </Button>
      </div>
    </div>
  );
}

interface NodeChipProps {
  node: { id: string; nome: string; tipo: string };
  isKeep: boolean;
  confirming: boolean;
  deleting: string | null;
  disabled: boolean;
  onSetKeep: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancel: () => void;
}

function NodeChip({ node: n, isKeep, confirming, deleting, disabled, onSetKeep, onAskDelete, onConfirmDelete, onCancel }: NodeChipProps) {
  const color = TIPO_COLORS[n.tipo] ?? "#71717a";
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onSetKeep}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors text-left ${isKeep ? "border-primary/60 bg-primary/5" : "border-border hover:border-border/80"}`}
      >
        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0" style={{ borderColor: color, color }}>
          {n.tipo.toLowerCase()}
        </Badge>
        <span className={`text-sm ${isKeep ? "font-semibold text-primary" : "font-medium"}`}>{n.nome}</span>
        {isKeep && <span className="text-[10px] text-primary/70 font-medium shrink-0">manter</span>}
      </button>
      {!isKeep && !confirming && (
        <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" disabled={!!deleting || disabled} title="Excluir este nó" onClick={onAskDelete}>
          {deleting === n.id ? <Loader2Icon className="size-3 animate-spin" /> : <Trash2Icon className="size-3" />}
        </Button>
      )}
      {!isKeep && confirming && (
        <div className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-1.5 py-0.5">
          <span className="text-[10px] text-destructive font-medium">excluir?</span>
          <button className="text-[10px] text-destructive font-bold hover:underline" onClick={onConfirmDelete} disabled={!!deleting}>
            sim
          </button>
          <span className="text-[10px] text-muted-foreground">/</span>
          <button className="text-[10px] text-muted-foreground hover:underline" onClick={onCancel}>
            não
          </button>
        </div>
      )}
    </div>
  );
}
