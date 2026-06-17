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
import { Loader2Icon, PlusIcon, CheckIcon, GitBranchIcon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { detectMissingPrerequisites, addMissingPrerequisite } from "@/lib/ai-api";

interface MissingPrereq {
  nome: string;
  tipo: string;
  motivo: string;
  shouldConnectTo: Array<{ id: string; nome: string }>;
}

interface MissingPrereqsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onAdded: () => void;
}

type Step = "loading" | "results" | "error";

const TIPO_COLORS: Record<string, string> = {
  TOPICO: "#0ea5e9",
  CONCEITO: "#10b981",
};

export function MissingPrereqsModal({ open, onOpenChange, grafoId, onAdded }: MissingPrereqsModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [prereqs, setPrereqs] = useState<MissingPrereq[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    setStep("loading");
    setAdded(new Set());
    try {
      const res = await detectMissingPrerequisites(grafoId);
      setPrereqs(res.prerequisites);
      setStep("results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao analisar pré-requisitos.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = async (idx: number) => {
    const p = prereqs[idx];
    if (!p) return;
    setAdding(idx);
    try {
      const connectToIds = p.shouldConnectTo.map(n => n.id);
      await addMissingPrerequisite(grafoId, p.nome, p.tipo, connectToIds);
      toast.success(`"${p.nome}" adicionado ao grafo.`);
      setAdded(prev => new Set([...prev, idx]));
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar nó.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <GitBranchIcon className="size-4 text-primary" />
            Pré-requisitos faltantes
          </DialogTitle>
          <DialogDescription>
            A IA analisou o grafo e detectou conceitos que deveriam existir como pré-requisitos mas ainda não estão presentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2">
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Analisando pré-requisitos...</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {step === "results" && prereqs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckIcon className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">Nenhum pré-requisito faltante detectado!</p>
              <p className="text-xs text-muted-foreground">O grafo parece ter uma base de conhecimento bem estruturada.</p>
            </div>
          )}

          {step === "results" && prereqs.map((p, i) => {
            const isAdded = added.has(i);
            const isAdding = adding === i;
            return (
              <div key={i} className={`rounded-lg border p-3 space-y-1.5 transition-colors ${isAdded ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                        style={{ borderColor: (TIPO_COLORS[p.tipo] ?? "#6366f1") + "80", color: TIPO_COLORS[p.tipo] ?? "#6366f1" }}
                      >
                        {p.tipo.toLowerCase()}
                      </Badge>
                      <span className="text-sm font-semibold">{p.nome}</span>
                    </div>
                    {p.motivo && (
                      <p className="text-xs text-muted-foreground">{p.motivo}</p>
                    )}
                    {p.shouldConnectTo.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Pré-requisito de:{" "}
                        {p.shouldConnectTo.map(n => n.nome).join(", ")}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isAdded ? "ghost" : "outline"}
                    className={`shrink-0 gap-1.5 h-7 ${isAdded ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                    disabled={isAdded || isAdding}
                    onClick={() => handleAdd(i)}
                  >
                    {isAdding ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : isAdded ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <PlusIcon className="size-3.5" />
                    )}
                    {isAdded ? "Adicionado" : isAdding ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
