"use client";

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
import { Loader2Icon, Trash2Icon, CheckCircle2Icon, AlertCircleIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { detectDuplicates } from "@/lib/ai-api";
import { deleteGraphNode } from "@/lib/graph-api";

interface DuplicateNode { id: string; nome: string; tipo: string; }
interface DuplicateGroup { nodes: DuplicateNode[]; sugestao: string; }

interface DuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onDeleted: () => void;
}

type Step = "loading" | "results" | "error";

const TIPO_COLORS: Record<string, string> = {
  ASSUNTO: "#6366f1",
  TOPICO: "#0ea5e9",
  CONCEITO: "#10b981",
};

export function DuplicatesModal({ open, onOpenChange, grafoId, onDeleted }: DuplicatesModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    setStep("loading");
    try {
      const res = await detectDuplicates(grafoId);
      setGroups(res.groups);
      setStep("results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao detectar duplicatas.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDelete = async (node: DuplicateNode, groupIdx: number) => {
    if (!window.confirm(`Excluir "${node.nome}" permanentemente?`)) return;
    setDeleting(node.id);
    try {
      await deleteGraphNode(node.id, grafoId);
      toast.success(`"${node.nome}" excluído.`);
      onDeleted();
      setGroups(prev => {
        const next = [...prev];
        const g = next[groupIdx];
        const remaining = g.nodes.filter(n => n.id !== node.id);
        if (remaining.length < 2) {
          next.splice(groupIdx, 1);
        } else {
          next[groupIdx] = { ...g, nodes: remaining };
        }
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir nó.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Analisando duplicatas...</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {step === "results" && groups.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2Icon className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">Nenhuma duplicata encontrada neste grafo!</p>
              <p className="text-xs text-muted-foreground">Todos os nós parecem semanticamente distintos.</p>
            </div>
          )}

          {step === "results" && groups.map((g, gi) => (
            <div key={gi} className="rounded-lg border border-border p-3 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {g.nodes.map(n => (
                  <div
                    key={n.id}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1"
                    style={{ borderColor: (TIPO_COLORS[n.tipo] ?? "#71717a") + "50" }}
                  >
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0"
                      style={{ borderColor: TIPO_COLORS[n.tipo] ?? "#71717a", color: TIPO_COLORS[n.tipo] ?? "#71717a" }}
                    >
                      {n.tipo.toLowerCase()}
                    </Badge>
                    <span className="text-sm font-medium">{n.nome}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deleting === n.id}
                      onClick={() => handleDelete(n, gi)}
                    >
                      {deleting === n.id
                        ? <Loader2Icon className="size-3 animate-spin" />
                        : <Trash2Icon className="size-3" />}
                    </Button>
                  </div>
                ))}
              </div>
              {g.sugestao && (
                <p className="text-[11px] text-muted-foreground italic">{g.sugestao}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
