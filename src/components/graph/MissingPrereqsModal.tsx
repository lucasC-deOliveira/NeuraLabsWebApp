"use client";

import { useEffect, useState, useRef } from "react";
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
import { Loader2Icon, PlusIcon, CheckIcon, GitBranchIcon, AlertCircleIcon, SparklesIcon, RefreshCwIcon } from "lucide-react";
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

type Step = "loading" | "results" | "adding" | "error";

const TIPO_COLORS: Record<string, string> = {
  TOPICO: "#0ea5e9",
  CONCEITO: "#10b981",
};

function GapCheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-all ${
        checked ? "border-primary bg-primary/15" : "border-muted-foreground/30 hover:border-primary/50"
      }`}
    >
      {checked && <CheckIcon className="size-2.5 text-primary" />}
      <span className="sr-only">{label}</span>
    </button>
  );
}

const ANALYSIS_STEPS = [
  "Mapeando estrutura de conhecimento do grafo...",
  "Identificando lacunas conceituais...",
  "Verificando cadeia de dependências...",
  "Sugerindo pré-requisitos ausentes...",
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

export function MissingPrereqsModal({ open, onOpenChange, grafoId, onAdded }: MissingPrereqsModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [prereqs, setPrereqs] = useState<MissingPrereq[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
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
      subStepRef.current = setInterval(() => {
        setSubStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
      }, 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subStepRef.current) clearInterval(subStepRef.current);
    };
  }, [step]);

  const load = async () => {
    setStep("loading");
    setAdded(new Set());
    setSelected(new Set());
    try {
      const res = await detectMissingPrerequisites(grafoId);
      setPrereqs(res.prerequisites);
      setStep("results");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao analisar pré-requisitos.");
      setStep("error");
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const available = prereqs.map((_, i) => i).filter(i => !added.has(i));
    const allSelected = available.length > 0 && available.every(i => selected.has(i));
    setSelected(allSelected ? new Set() : new Set(available));
  };

  const handleAddSelected = async () => {
    const toAdd = [...selected].filter(i => !added.has(i));
    if (!toAdd.length) return;
    setStep("adding");
    const results = await Promise.allSettled(
      toAdd.map(async (i) => {
        const p = prereqs[i];
        await addMissingPrerequisite(grafoId, p.nome, p.tipo, p.shouldConnectTo.map(n => n.id));
        return i;
      })
    );
    const succeeded = new Set<number>();
    let failCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") succeeded.add(r.value);
      else failCount++;
    }
    setAdded(prev => new Set([...prev, ...succeeded]));
    setSelected(new Set());
    setStep("results");
    if (succeeded.size) {
      onAdded();
      toast.success(`${succeeded.size} pré-requisito${succeeded.size > 1 ? "s adicionados" : " adicionado"} ao grafo.`);
    }
    if (failCount) toast.error(`${failCount} item${failCount > 1 ? "s falharam" : " falhou"} ao ser adicionado.`);
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

  const handleOpenChange = (o: boolean) => {
    if (!o && (step === "loading" || step === "adding")) return;
    onOpenChange(o);
  };

  const availableIdxs = prereqs.map((_, i) => i).filter(i => !added.has(i));
  const allSelected = availableIdxs.length > 0 && availableIdxs.every(i => selected.has(i));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <div className="space-y-5 py-6 px-1">
              <StepRow
                index={1}
                label="Detectando pré-requisitos com IA"
                sublabel={ANALYSIS_STEPS[subStep]}
                status="active"
                elapsed={elapsed}
              />
              <StepRow
                index={2}
                label="Apresentar sugestões"
                status="pending"
              />
              {elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {(step === "results" || step === "adding") && prereqs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckIcon className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">Nenhum pré-requisito faltante detectado!</p>
              <p className="text-xs text-muted-foreground">O grafo parece ter uma base de conhecimento bem estruturada.</p>
            </div>
          )}

          {/* Fase: adicionando em massa */}
          {step === "adding" && prereqs.length > 0 && (
            <div className="space-y-5 py-6 px-1">
              <StepRow index={1} label="Analisando pré-requisitos" status="done" />
              <StepRow index={2} label="Adicionando ao grafo" sublabel="Criando nós e conexões..." status="active" elapsed={elapsed} />
              <StepRow index={3} label="Concluído" status="pending" />
            </div>
          )}

          {step === "results" && prereqs.length > 0 && (
            <>
              {/* Cabeçalho com "Selecionar todos" */}
              {availableIdxs.length > 0 && (
                <div className="flex items-center justify-between px-0.5 pb-1">
                  <p className="text-xs text-muted-foreground">
                    {selected.size > 0 ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}` : "Selecione para adicionar em massa"}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={toggleAll}
                  >
                    {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                </div>
              )}

              {prereqs.map((p, i) => {
                const isAdded = added.has(i);
                const isAdding = adding === i;
                const isSelected = selected.has(i);
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                      isAdded ? "border-emerald-500/40 bg-emerald-500/5" : isSelected ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!isAdded && (
                        <div className="mt-0.5 shrink-0">
                          <GapCheckItem
                            label={p.nome}
                            checked={isSelected}
                            onChange={() => toggleSelect(i)}
                          />
                        </div>
                      )}
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
                        {isAdded ? "Adicionado" : isAdding ? "..." : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <Separator className="my-3 shrink-0" />
        <div className="shrink-0 flex gap-2">
          {(step === "loading" || step === "adding") && (
            <Button className="flex-1" variant="secondary" disabled>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {step === "results" && prereqs.length > 0 && (
            <>
              <Button variant="outline" className="gap-2" onClick={load}>
                <RefreshCwIcon className="size-4" />
                Regerar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleAddSelected}
                disabled={selected.size === 0}
              >
                <SparklesIcon className="size-4" />
                Adicionar selecionados ({selected.size})
              </Button>
            </>
          )}

          {step === "results" && prereqs.length === 0 && (
            <Button className="flex-1" variant="secondary" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          )}

          {step === "error" && (
            <>
              <Button variant="outline" className="gap-2" onClick={load}>
                <RefreshCwIcon className="size-4" />
                Tentar novamente
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
