"use client";

import { useEffect, useRef, useState } from "react";
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
  CheckCircle2Icon,
  AlertCircleIcon,
  CopyIcon,
  GitMergeIcon,
  CheckIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { detectDuplicates, mergeDuplicates } from "@/lib/ai-api";
import { deleteGraphNode } from "@/lib/graph-api";

interface DuplicateNode { id: string; nome: string; tipo: string; }
interface DuplicateGroup { nodes: DuplicateNode[]; sugestao: string; }

interface DuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onDeleted: () => void;
}

type Step = "loading" | "results" | "done" | "error";

const TIPO_COLORS: Record<string, string> = {
  ASSUNTO: "#6366f1",
  TOPICO: "#0ea5e9",
  CONCEITO: "#10b981",
};

const ANALYSIS_STEPS = [
  "Carregando nós do grafo...",
  "Comparando nomes e descrições...",
  "Detectando equivalências semânticas...",
  "Agrupando candidatos...",
  "Finalizando análise...",
];

function StepRow({
  index,
  label,
  sublabel,
  status,
  elapsed,
}: {
  index: number;
  label: string;
  sublabel?: string;
  status: "done" | "active" | "pending";
  elapsed?: number;
}) {
  return (
    <div className={`flex items-start gap-3 transition-opacity ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
      <div className="mt-0.5 shrink-0">
        {status === "done" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckIcon className="size-3.5" />
          </span>
        ) : status === "active" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
            <Loader2Icon className="size-3.5 animate-spin text-primary" />
          </span>
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground font-medium">
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-tight ${status === "active" ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        {status === "active" && sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
        {status === "active" && elapsed !== undefined && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 tabular-nums">
            {Math.floor(elapsed / 60) > 0
              ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
              : `${elapsed}s`}
          </p>
        )}
      </div>
    </div>
  );
}

export function DuplicatesModal({ open, onOpenChange, grafoId, onDeleted }: DuplicatesModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ nodeId: string; groupIdx: number } | null>(null);
  const [merging, setMerging] = useState<Set<number>>(new Set());
  const [mergingAll, setMergingAll] = useState(false);
  const [keepSelection, setKeepSelection] = useState<Map<number, string>>(new Map());
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "loading") {
      setElapsed(0);
      setSubStep(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      subStepRef.current = setInterval(() => setSubStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 2500);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (subStepRef.current) { clearInterval(subStepRef.current); subStepRef.current = null; }
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (subStepRef.current) { clearInterval(subStepRef.current); subStepRef.current = null; }
    };
  }, [step]);

  const load = async () => {
    setStep("loading");
    setResolvedCount(0);
    setConfirmDelete(null);
    try {
      const res = await detectDuplicates(grafoId);
      setGroups(res.groups);
      setInitialCount(res.groups.length);
      setStep(res.groups.length === 0 ? "done" : "results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao detectar duplicatas.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setKeepSelection(new Map(groups.map((g, i) => [i, g.nodes[0]?.id ?? ""])));
  }, [groups]);

  const removeGroup = (groupIdx: number) => {
    setGroups(prev => {
      const next = prev.filter((_, i) => i !== groupIdx);
      if (next.length === 0) setStep("done");
      return next;
    });
    setResolvedCount(c => c + 1);
    onDeleted();
  };

  const handleMerge = async (groupIdx: number) => {
    const g = groups[groupIdx];
    const keepId = keepSelection.get(groupIdx) ?? g.nodes[0]?.id;
    if (!keepId) return;
    const deleteIds = g.nodes.filter(n => n.id !== keepId).map(n => n.id);
    if (!deleteIds.length) return;
    const keepNode = g.nodes.find(n => n.id === keepId);
    setMerging(prev => new Set(prev).add(groupIdx));
    try {
      const res = await mergeDuplicates(grafoId, keepId, deleteIds);
      toast.success(
        `Mesclado em "${keepNode?.nome}": ${res.merged} nó(s) removido(s), ${res.edgesMoved} aresta(s) migrada(s).`,
      );
      removeGroup(groupIdx);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mesclar nós.");
    } finally {
      setMerging(prev => { const next = new Set(prev); next.delete(groupIdx); return next; });
    }
  };

  const handleMergeAll = async () => {
    setMergingAll(true);
    let merged = 0;
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const g = groups[gi];
      const keepId = keepSelection.get(gi) ?? g.nodes[0]?.id;
      if (!keepId) continue;
      const deleteIds = g.nodes.filter(n => n.id !== keepId).map(n => n.id);
      if (!deleteIds.length) continue;
      try {
        await mergeDuplicates(grafoId, keepId, deleteIds);
        merged++;
      } catch { /* ignora grupos com erro */ }
    }
    setMergingAll(false);
    if (merged > 0) {
      toast.success(`${merged} grupo(s) mesclado(s) com sucesso.`);
      setGroups([]);
      setResolvedCount(c => c + merged);
      setStep("done");
      onDeleted();
    } else {
      toast.error("Nenhum grupo pôde ser mesclado.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { nodeId, groupIdx } = confirmDelete;
    const g = groups[groupIdx];
    const node = g.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setConfirmDelete(null);
    setDeleting(nodeId);
    try {
      await deleteGraphNode(nodeId, grafoId);
      toast.success(`"${node.nome}" excluído.`);
      const remaining = g.nodes.filter(n => n.id !== nodeId);
      if (remaining.length < 2) {
        removeGroup(groupIdx);
      } else {
        setGroups(prev => {
          const next = [...prev];
          next[groupIdx] = { ...g, nodes: remaining };
          return next;
        });
        onDeleted();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir nó.");
    } finally {
      setDeleting(null);
    }
  };

  const busy = mergingAll || merging.size > 0 || !!deleting;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && busy) return; onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <CopyIcon className="size-4 text-primary" />
            Detecção de duplicatas
          </DialogTitle>
          <DialogDescription>
            A IA agrupa nós semanticamente equivalentes para você decidir quais manter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">

          {/* Loading */}
          {step === "loading" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow
                index={1}
                label="Analisando nós com IA"
                sublabel={ANALYSIS_STEPS[subStep]}
                status="active"
                elapsed={elapsed}
              />
              <StepRow index={2} label="Apresentar resultados" status="pending" />
              {elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <ShieldCheckIcon className="size-12 text-emerald-500" />
              <p className="text-base font-semibold">
                {initialCount === 0 ? "Nenhuma duplicata encontrada!" : "Todos os grupos resolvidos!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {initialCount === 0
                  ? "Todos os nós parecem semanticamente distintos."
                  : `${resolvedCount} grupo(s) resolvido(s). O grafo está limpo.`}
              </p>
              <Button size="sm" variant="outline" onClick={load} className="mt-2">
                Verificar novamente
              </Button>
            </div>
          )}

          {/* Results */}
          {step === "results" && (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between px-0.5 pb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {groups.length} grupo{groups.length !== 1 ? "s" : ""}
                  </Badge>
                  {resolvedCount > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">
                      · {resolvedCount} resolvido{resolvedCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {groups.length > 1 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 text-xs h-7"
                    disabled={busy}
                    onClick={handleMergeAll}
                  >
                    {mergingAll
                      ? <Loader2Icon className="size-3 animate-spin" />
                      : <GitMergeIcon className="size-3" />}
                    Mesclar todos
                  </Button>
                )}
              </div>
              <Separator />

              {groups.map((g, gi) => {
                const keepId = keepSelection.get(gi) ?? g.nodes[0]?.id;
                const isMerging = merging.has(gi);
                return (
                  <div key={gi} className="rounded-lg border border-border bg-card p-3 space-y-3">
                    {/* Suggestion */}
                    {g.sugestao && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{g.sugestao}</p>
                    )}

                    {/* Node chips */}
                    <div className="flex flex-wrap gap-2">
                      {g.nodes.map(n => {
                        const isKeep = keepId === n.id;
                        const isConfirming = confirmDelete?.nodeId === n.id && confirmDelete.groupIdx === gi;
                        return (
                          <div key={n.id} className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setConfirmDelete(null);
                                setKeepSelection(prev => new Map(prev).set(gi, n.id));
                              }}
                              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors text-left ${
                                isKeep
                                  ? "border-primary/60 bg-primary/5"
                                  : "border-border hover:border-border/80"
                              }`}
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 shrink-0"
                                style={{
                                  borderColor: TIPO_COLORS[n.tipo] ?? "#71717a",
                                  color: TIPO_COLORS[n.tipo] ?? "#71717a",
                                }}
                              >
                                {n.tipo.toLowerCase()}
                              </Badge>
                              <span className={`text-sm ${isKeep ? "font-semibold text-primary" : "font-medium"}`}>
                                {n.nome}
                              </span>
                              {isKeep && (
                                <span className="text-[10px] text-primary/70 font-medium shrink-0">manter</span>
                              )}
                            </button>

                            {/* Delete / confirm delete */}
                            {!isKeep && !isConfirming && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                disabled={!!deleting || isMerging || mergingAll}
                                title="Excluir este nó"
                                onClick={() => setConfirmDelete({ nodeId: n.id, groupIdx: gi })}
                              >
                                {deleting === n.id
                                  ? <Loader2Icon className="size-3 animate-spin" />
                                  : <Trash2Icon className="size-3" />}
                              </Button>
                            )}

                            {/* Inline confirm */}
                            {!isKeep && isConfirming && (
                              <div className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-1.5 py-0.5">
                                <span className="text-[10px] text-destructive font-medium">excluir?</span>
                                <button
                                  className="text-[10px] text-destructive font-bold hover:underline"
                                  onClick={handleDeleteConfirm}
                                  disabled={!!deleting}
                                >
                                  sim
                                </button>
                                <span className="text-[10px] text-muted-foreground">/</span>
                                <button
                                  className="text-[10px] text-muted-foreground hover:underline"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  não
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[11px] text-muted-foreground">
                        Clique num nó para marcá-lo como principal.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-7"
                        disabled={isMerging || !!deleting || mergingAll}
                        onClick={() => handleMerge(gi)}
                      >
                        {isMerging
                          ? <Loader2Icon className="size-3 animate-spin" />
                          : <GitMergeIcon className="size-3" />}
                        Mesclar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {step === "loading" && (
          <>
            <Separator className="my-3 shrink-0" />
            <div className="shrink-0">
              <Button className="w-full" variant="secondary" disabled>
                <Loader2Icon className="size-4 mr-2 animate-spin" />
                Processando...
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
