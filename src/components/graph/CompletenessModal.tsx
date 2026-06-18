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
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon,
  BarChart2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  CheckIcon,
  SparklesIcon,
} from "lucide-react";
import { assessCompleteness, fillKnowledgeGaps, type GapItem } from "@/lib/ai-api";
import { toast } from "sonner";

interface CompletenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onGenerated?: () => void;
}

interface Assessment {
  assuntoId: string;
  assuntoNome: string;
  score: number;
  wellCovered: string[];
  shallow: string[];
  missing: string[];
}

type UIStep = "idle" | "loading" | "done" | "generating" | "generated" | "error";

const ANALYSIS_STEPS = [
  "Lendo todos os assuntos e tópicos do grafo...",
  "Avaliando profundidade de cada conceito...",
  "Identificando áreas rasas ou incompletas...",
  "Detectando tópicos ausentes por assunto...",
  "Calculando pontuações de cobertura...",
];

const GENERATE_STEPS = [
  "Planejando conteúdo para as lacunas...",
  "Gerando tópicos e conceitos novos...",
  "Escrevendo notas explicativas...",
  "Criando flashcards de estudo...",
  "Salvando no grafo...",
];

function StepRow({
  index, label, sublabel, status, elapsed,
}: {
  index: number; label: string; sublabel?: string;
  status: "done" | "active" | "pending"; elapsed?: number;
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
            {Math.floor(elapsed / 60) > 0 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`}
          </p>
        )}
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${scoreColor(score)}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground w-8 text-right">{score}/10</span>
    </div>
  );
}

function GapCheckItem({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group py-0.5" onClick={onChange}>
      <div
        className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded border transition-all ${
          checked ? "border-primary bg-primary/15" : "border-muted-foreground/30 group-hover:border-primary/50"
        }`}
      >
        {checked && <CheckIcon className="size-2 text-primary" />}
      </div>
      <span className="text-xs text-muted-foreground leading-snug">{label}</span>
    </label>
  );
}

function itemKey(assuntoId: string, tipo: "missing" | "shallow", nome: string) {
  return `${assuntoId}:${tipo}:${nome}`;
}

export function CompletenessModal({ open, onOpenChange, grafoId, onGenerated }: CompletenessModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("idle");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [genResult, setGenResult] = useState<{ topicos: number; conceitos: number; notas: number; flashcards: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subStepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimers = (steps: string[]) => {
    setElapsed(0);
    setSubStep(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    subStepRef.current = setInterval(() => setSubStep(s => Math.min(s + 1, steps.length - 1)), 2500);
  };
  const stopTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (subStepRef.current) clearInterval(subStepRef.current);
  };

  useEffect(() => {
    if (uiStep === "loading") startTimers(ANALYSIS_STEPS);
    else if (uiStep === "generating") startTimers(GENERATE_STEPS);
    else stopTimers();
    return stopTimers;
  }, [uiStep]);

  const load = async () => {
    setUiStep("loading");
    setSelectedGaps(new Set());
    setGenResult(null);
    try {
      const res = await assessCompleteness(grafoId);
      setAssessments(res.assessments);
      setUiStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao avaliar completude.");
      setUiStep("error");
    }
  };

  useEffect(() => {
    if (open && uiStep === "idle") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleGap = (assuntoId: string, tipo: "missing" | "shallow", nome: string) => {
    const key = itemKey(assuntoId, tipo, nome);
    setSelectedGaps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const buildGapItems = (): GapItem[] => {
    const items: GapItem[] = [];
    for (const a of assessments) {
      for (const nome of a.missing) {
        if (selectedGaps.has(itemKey(a.assuntoId, "missing", nome)))
          items.push({ nome, tipo: "missing", assuntoId: a.assuntoId, assuntoNome: a.assuntoNome });
      }
      for (const nome of a.shallow) {
        if (selectedGaps.has(itemKey(a.assuntoId, "shallow", nome)))
          items.push({ nome, tipo: "shallow", assuntoId: a.assuntoId, assuntoNome: a.assuntoNome });
      }
    }
    return items;
  };

  const handleGenerate = async () => {
    const gaps = buildGapItems();
    if (!gaps.length) return;
    setUiStep("generating");
    try {
      const result = await fillKnowledgeGaps(grafoId, gaps);
      setGenResult(result);
      setUiStep("generated");
      onGenerated?.();
      toast.success(`Conteúdo gerado: ${result.topicos} tópicos, ${result.conceitos} conceitos, ${result.notas} notas, ${result.flashcards} flashcards.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar conteúdo.");
      setUiStep("done");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && (uiStep === "loading" || uiStep === "generating")) return;
    if (!o) setUiStep("idle");
    onOpenChange(o);
  };

  const hasSelectableGaps = assessments.some(a => a.missing.length > 0 || a.shallow.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <BarChart2Icon className="size-4 text-primary" />
            Completude do conhecimento
          </DialogTitle>
          <DialogDescription>
            {uiStep === "done" && hasSelectableGaps
              ? "Selecione os itens faltantes ou rasos que a IA deve gerar conteúdo."
              : "Análise de cobertura por assunto gerada pela IA."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {/* Fase: analisando */}
          {uiStep === "loading" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow index={1} label="Avaliando completude com IA" sublabel={ANALYSIS_STEPS[subStep]} status="active" elapsed={elapsed} />
              <StepRow index={2} label="Apresentar relatório de cobertura" status="pending" />
              {elapsed > 15 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {/* Fase: gerando conteúdo */}
          {uiStep === "generating" && (
            <div className="space-y-5 py-6 px-1">
              <StepRow index={1} label="Análise de completude" status="done" />
              <StepRow index={2} label="Gerando conteúdo para lacunas" sublabel={GENERATE_STEPS[subStep]} status="active" elapsed={elapsed} />
              <StepRow index={3} label="Concluído" status="pending" />
              {elapsed > 20 && (
                <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                  A IA está processando — modelos locais podem levar 1-2 minutos.
                </p>
              )}
            </div>
          )}

          {/* Fase: gerado com sucesso */}
          {uiStep === "generated" && genResult && (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckIcon className="size-6" />
              </span>
              <p className="text-base font-semibold">Conteúdo gerado!</p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-sm">
                <StatCard label="Tópicos" value={genResult.topicos} />
                <StatCard label="Conceitos" value={genResult.conceitos} />
                <StatCard label="Notas" value={genResult.notas} />
                <StatCard label="Flashcards" value={genResult.flashcards} />
              </div>
            </div>
          )}

          {/* Erro */}
          {uiStep === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {/* Resultados */}
          {uiStep === "done" && assessments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum assunto encontrado no grafo.</p>
          )}

          {uiStep === "done" && assessments.length > 0 && (
            <div className="space-y-3 pr-1">
              {assessments.map(a => (
                <div key={a.assuntoId} className="rounded-lg border border-border p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold mb-1.5">{a.assuntoNome}</h3>
                    <ScoreBar score={a.score} />
                  </div>

                  {a.wellCovered.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <CheckCircleIcon className="size-3" /> Bem coberto
                      </p>
                      <ul className="space-y-0.5">
                        {a.wellCovered.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-0.5 text-green-500">•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.shallow.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <AlertCircleIcon className="size-3" /> Raso — selecione para gerar
                      </p>
                      <div className="space-y-0.5">
                        {a.shallow.map((item, i) => (
                          <GapCheckItem
                            key={i}
                            label={item}
                            checked={selectedGaps.has(itemKey(a.assuntoId, "shallow", item))}
                            onChange={() => toggleGap(a.assuntoId, "shallow", item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {a.missing.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <XCircleIcon className="size-3" /> Faltando — selecione para gerar
                      </p>
                      <div className="space-y-0.5">
                        {a.missing.map((item, i) => (
                          <GapCheckItem
                            key={i}
                            label={item}
                            checked={selectedGaps.has(itemKey(a.assuntoId, "missing", item))}
                            onChange={() => toggleGap(a.assuntoId, "missing", item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-3 shrink-0" />
        <div className="shrink-0 flex gap-2">
          {(uiStep === "loading" || uiStep === "generating") && (
            <Button className="flex-1" variant="secondary" disabled>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {uiStep === "done" && (
            <>
              <Button variant="outline" className="gap-2" onClick={load}>
                <RefreshCwIcon className="size-4" />
                Regerar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleGenerate}
                disabled={selectedGaps.size === 0}
              >
                <SparklesIcon className="size-4" />
                Gerar selecionados ({selectedGaps.size})
              </Button>
            </>
          )}

          {(uiStep === "error" || uiStep === "generated") && (
            <>
              {uiStep === "error" && (
                <Button variant="outline" className="gap-2" onClick={load}>
                  <RefreshCwIcon className="size-4" />
                  Regerar
                </Button>
              )}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </div>
  );
}
