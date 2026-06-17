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
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon,
  BarChart2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { assessCompleteness } from "@/lib/ai-api";

interface CompletenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
}

interface Assessment {
  assuntoId: string;
  assuntoNome: string;
  score: number;
  wellCovered: string[];
  shallow: string[];
  missing: string[];
}

type UIStep = "idle" | "loading" | "done" | "error";

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score)}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground w-8 text-right">
        {score}/10
      </span>
    </div>
  );
}

export function CompletenessModal({ open, onOpenChange, grafoId }: CompletenessModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("idle");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    setUiStep("loading");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <BarChart2Icon className="size-4 text-primary" />
            Completude do conhecimento
          </DialogTitle>
          <DialogDescription>
            Análise de cobertura por assunto gerada pela IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {uiStep === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Avaliando completude do conhecimento...</p>
              <p className="text-xs text-center max-w-xs">
                A IA está analisando a profundidade e lacunas de cada assunto.
              </p>
            </div>
          )}

          {uiStep === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {uiStep === "done" && assessments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum assunto encontrado no grafo.
            </p>
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
                            <span className="mt-0.5 text-green-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.shallow.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <AlertCircleIcon className="size-3" /> Raso
                      </p>
                      <ul className="space-y-0.5">
                        {a.shallow.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-0.5 text-yellow-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.missing.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <XCircleIcon className="size-3" /> Faltando
                      </p>
                      <ul className="space-y-0.5">
                        {a.missing.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-0.5 text-red-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-3 shrink-0" />
        <div className="shrink-0 flex gap-2">
          {(uiStep === "done" || uiStep === "error") && (
            <Button variant="outline" className="gap-2" onClick={load}>
              <RefreshCwIcon className="size-4" />
              Regerar
            </Button>
          )}
          <Button className="flex-1" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
