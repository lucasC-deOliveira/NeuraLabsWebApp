"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SparklesIcon, PlusIcon, ZapIcon } from "lucide-react";
import { toast } from "sonner";
import { suggestGapFill, addInsightsToGraph, type NodeInsight } from "@/lib/ai-api";
import { MarkdownContent } from "@/components/markdown-content";
import type { StructuralGap } from "@/lib/graph-communities";

interface GapDetectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  gaps: StructuralGap[];
  onAdded?: () => void;
  onHighlightGap: (gap: StructuralGap | null) => void;
}

interface GapResult {
  gapIndex: number;
  insights: NodeInsight[];
  selected: Set<number>;
}

export function GapDetectionModal({
  open,
  onOpenChange,
  grafoId,
  gaps,
  onAdded,
  onHighlightGap,
}: GapDetectionModalProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Map<number, GapResult>>(new Map());

  const handleFill = async (gapIdx: number) => {
    const gap = gaps[gapIdx];
    if (!gap) return;
    setLoading(gapIdx);
    try {
      const res = await suggestGapFill(grafoId, {
        labelsA: gap.communityA.nodes.map(n => n.label),
        labelsB: gap.communityB.nodes.map(n => n.label),
        bridgeA: gap.bridgeA.label,
        bridgeB: gap.bridgeB.label,
      });
      setResults(prev => {
        const next = new Map(prev);
        next.set(gapIdx, { gapIndex: gapIdx, insights: res.insights, selected: new Set(res.insights.map((_, i) => i)) });
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar sugestões.");
    } finally {
      setLoading(null);
    }
  };

  const toggleInsight = (gapIdx: number, insightIdx: number) => {
    setResults(prev => {
      const r = prev.get(gapIdx);
      if (!r) return prev;
      const sel = new Set(r.selected);
      if (sel.has(insightIdx)) sel.delete(insightIdx); else sel.add(insightIdx);
      return new Map(prev).set(gapIdx, { ...r, selected: sel });
    });
  };

  const handleAdd = async (gapIdx: number) => {
    const r = results.get(gapIdx);
    if (!r) return;
    const gap = gaps[gapIdx];
    const toAdd = r.insights.filter((_, i) => r.selected.has(i));
    if (!toAdd.length) { toast.error("Selecione ao menos um nó."); return; }
    setAdding(prev => new Set(prev).add(gapIdx));
    try {
      // Adiciona a partir do nó ponte de A
      const { added } = await addInsightsToGraph(grafoId, gap.bridgeA.id, toAdd);
      toast.success(`${added} nó(s) adicionado(s) ao grafo.`);
      onAdded?.();
      setResults(prev => { const next = new Map(prev); next.delete(gapIdx); return next; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar nós.");
    } finally {
      setAdding(prev => { const next = new Set(prev); next.delete(gapIdx); return next; });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onHighlightGap(null); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <ZapIcon className="size-4 text-amber-500" />
            Lacunas estruturais
          </DialogTitle>
          <DialogDescription>
            {gaps.length === 0
              ? "Nenhuma lacuna encontrada — o grafo está bem conectado."
              : `${gaps.length} par(es) de clusters sem conexão entre si. Use IA para sugerir nós que os conectem.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {gaps.map((gap, i) => {
            const r = results.get(i);
            const isLoading = loading === i;
            return (
              <div
                key={i}
                className="rounded-lg border border-border p-3 space-y-3"
                onMouseEnter={() => onHighlightGap(gap)}
                onMouseLeave={() => onHighlightGap(null)}
              >
                {/* Cabeçalho da lacuna */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: gap.communityA.color }} />
                  <span className="font-medium truncate">{gap.communityA.label}</span>
                  <span className="text-muted-foreground shrink-0">↔</span>
                  <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: gap.communityB.color }} />
                  <span className="font-medium truncate">{gap.communityB.label}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Nós mais próximos: <strong>{gap.bridgeA.label}</strong> ↔ <strong>{gap.bridgeB.label}</strong>
                </p>

                {!r && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => handleFill(i)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
                    {isLoading ? "Gerando..." : "Preencher com IA"}
                  </Button>
                )}

                {r && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Sugestões (clique para selecionar):</p>
                    {r.insights.map((ins, j) => (
                      <button
                        key={j}
                        onClick={() => toggleInsight(i, j)}
                        className={`w-full text-left rounded-md border p-2.5 text-xs transition-all ${
                          r.selected.has(j)
                            ? "border-primary/60 bg-primary/5"
                            : "border-border bg-muted/30 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold">{ins.titulo}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">{ins.tipoNo}</span>
                        </div>
                        {ins.descricao && (
                          <p className="text-muted-foreground leading-relaxed">{ins.descricao}</p>
                        )}
                      </button>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleAdd(i)}
                        disabled={adding.has(i) || r.selected.size === 0}
                      >
                        {adding.has(i) ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
                        Adicionar ao grafo ({r.selected.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFill(i)}
                        disabled={isLoading}
                      >
                        <SparklesIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
