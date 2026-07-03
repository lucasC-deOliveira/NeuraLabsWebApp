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
  CheckIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type {
  CompletenessAssessment,
  GapItem,
  GeneratedContentCount,
} from "@/modules/graph/application/ports/graph-ai.port";
import { AiStepRow } from "./AiStepRow";

interface CompletenessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  onGenerated?: () => void;
}

type UIStep = "loading" | "done" | "generating" | "generated" | "error";

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

function itemKey(assuntoId: string, tipo: "missing" | "shallow", nome: string): string {
  return `${assuntoId}:${tipo}:${nome}`;
}

function buildGapItems(assessments: CompletenessAssessment[], selected: Set<string>): GapItem[] {
  const items: GapItem[] = [];
  for (const a of assessments) {
    for (const nome of a.missing) {
      if (selected.has(itemKey(a.assuntoId, "missing", nome))) items.push({ nome, tipo: "missing", assuntoId: a.assuntoId, assuntoNome: a.assuntoNome });
    }
    for (const nome of a.shallow) {
      if (selected.has(itemKey(a.assuntoId, "shallow", nome))) items.push({ nome, tipo: "shallow", assuntoId: a.assuntoId, assuntoNome: a.assuntoNome });
    }
  }
  return items;
}

export function CompletenessModal({ open, onOpenChange, grafoId, onGenerated }: CompletenessModalProps) {
  const [uiStep, setUiStep] = useState<UIStep>("loading");
  const [assessments, setAssessments] = useState<CompletenessAssessment[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [genResult, setGenResult] = useState<GeneratedContentCount | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setUiStep("loading"); setSelectedGaps(new Set()); setGenResult(null); setErrorMsg(""); setElapsed(0); setSubStep(0); }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .assessCompleteness(grafoId)
      .then((res) => { if (!ignore) { setAssessments(res.assessments); setUiStep("done"); } })
      .catch((e) => { if (!ignore) { setErrorMsg(e instanceof Error ? e.message : "Erro ao avaliar completude."); setUiStep("error"); } });
    return () => { ignore = true; };
  }, [open, grafoId, nonce]);

  useEffect(() => {
    if (uiStep !== "loading" && uiStep !== "generating") return;
    const stepsLen = uiStep === "loading" ? ANALYSIS_STEPS.length : GENERATE_STEPS.length;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const stepTimer = setInterval(() => setSubStep((s) => Math.min(s + 1, stepsLen - 1)), 2500);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [uiStep]);

  const retry = () => { setUiStep("loading"); setSelectedGaps(new Set()); setGenResult(null); setElapsed(0); setSubStep(0); setNonce((n) => n + 1); };
  const toggleGap = (assuntoId: string, tipo: "missing" | "shallow", nome: string) => {
    const key = itemKey(assuntoId, tipo, nome);
    setSelectedGaps((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const generate = async () => {
    const gaps = buildGapItems(assessments, selectedGaps);
    if (!gaps.length) return;
    setUiStep("generating");
    setElapsed(0);
    setSubStep(0);
    try {
      const result = await graphHttp.fillKnowledgeGaps(grafoId, gaps);
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
    onOpenChange(o);
  };

  const hasSelectableGaps = assessments.some((a) => a.missing.length > 0 || a.shallow.length > 0);

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
          <CompletenessBody
            uiStep={uiStep}
            elapsed={elapsed}
            subStep={subStep}
            errorMsg={errorMsg}
            assessments={assessments}
            selectedGaps={selectedGaps}
            genResult={genResult}
            onRetry={retry}
            onToggleGap={toggleGap}
          />
        </div>

        <Separator className="my-3 shrink-0" />
        <CompletenessFooter uiStep={uiStep} selectedCount={selectedGaps.size} onRetry={retry} onGenerate={generate} onClose={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface BodyProps {
  uiStep: UIStep;
  elapsed: number;
  subStep: number;
  errorMsg: string;
  assessments: CompletenessAssessment[];
  selectedGaps: Set<string>;
  genResult: GeneratedContentCount | null;
  onRetry: () => void;
  onToggleGap: (assuntoId: string, tipo: "missing" | "shallow", nome: string) => void;
}

function CompletenessBody(props: BodyProps) {
  if (props.uiStep === "loading") return <PhaseView step={1} label="Avaliando completude com IA" steps={ANALYSIS_STEPS} elapsed={props.elapsed} subStep={props.subStep} nextLabel="Apresentar relatório de cobertura" />;
  if (props.uiStep === "generating") return <GeneratingView elapsed={props.elapsed} subStep={props.subStep} />;
  if (props.uiStep === "generated" && props.genResult) return <GeneratedView result={props.genResult} />;
  if (props.uiStep === "error") return <ErrorView message={props.errorMsg} onRetry={props.onRetry} />;
  if (props.assessments.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">Nenhum assunto encontrado no grafo.</p>;
  return <AssessmentList assessments={props.assessments} selectedGaps={props.selectedGaps} onToggleGap={props.onToggleGap} />;
}

function PhaseView({ step, label, steps, elapsed, subStep, nextLabel }: { step: number; label: string; steps: string[]; elapsed: number; subStep: number; nextLabel: string }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={step} label={label} sublabel={steps[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={step + 1} label={nextLabel} status="pending" />
      {elapsed > 15 && (
        <p className="text-[11px] text-muted-foreground/60 text-center pt-2">A IA está processando — modelos locais podem levar 1-2 minutos.</p>
      )}
    </div>
  );
}

function GeneratingView({ elapsed, subStep }: { elapsed: number; subStep: number }) {
  return (
    <div className="space-y-5 py-6 px-1">
      <AiStepRow index={1} label="Análise de completude" status="done" />
      <AiStepRow index={2} label="Gerando conteúdo para lacunas" sublabel={GENERATE_STEPS[subStep]} status="active" elapsed={elapsed} />
      <AiStepRow index={3} label="Concluído" status="pending" />
    </div>
  );
}

function GeneratedView({ result }: { result: GeneratedContentCount }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <CheckIcon className="size-6" />
      </span>
      <p className="text-base font-semibold">Conteúdo gerado!</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-sm">
        <StatCard label="Tópicos" value={result.topicos} />
        <StatCard label="Conceitos" value={result.conceitos} />
        <StatCard label="Notas" value={result.notas} />
        <StatCard label="Flashcards" value={result.flashcards} />
      </div>
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

function AssessmentList({ assessments, selectedGaps, onToggleGap }: { assessments: CompletenessAssessment[]; selectedGaps: Set<string>; onToggleGap: BodyProps["onToggleGap"] }) {
  return (
    <div className="space-y-3 pr-1">
      {assessments.map((a) => (
        <div key={a.assuntoId} className="rounded-lg border border-border p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">{a.assuntoNome}</h3>
            <ScoreBar score={a.score} />
          </div>
          {a.wellCovered.length > 0 && <WellCovered items={a.wellCovered} />}
          {a.shallow.length > 0 && <GapSection assessment={a} tipo="shallow" selectedGaps={selectedGaps} onToggleGap={onToggleGap} />}
          {a.missing.length > 0 && <GapSection assessment={a} tipo="missing" selectedGaps={selectedGaps} onToggleGap={onToggleGap} />}
        </div>
      ))}
    </div>
  );
}

function WellCovered({ items }: { items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
        <CheckCircleIcon className="size-3" /> Bem coberto
      </p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="mt-0.5 text-green-500">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GapSection({ assessment: a, tipo, selectedGaps, onToggleGap }: { assessment: CompletenessAssessment; tipo: "missing" | "shallow"; selectedGaps: Set<string>; onToggleGap: BodyProps["onToggleGap"] }) {
  const items = tipo === "missing" ? a.missing : a.shallow;
  const label = tipo === "missing" ? "Faltando — selecione para gerar" : "Raso — selecione para gerar";
  const color = tipo === "missing" ? "text-red-600" : "text-yellow-600";
  const Icon = tipo === "missing" ? XCircleIcon : AlertCircleIcon;
  return (
    <div>
      <p className={`text-[11px] font-semibold ${color} uppercase tracking-wide mb-1 flex items-center gap-1`}>
        <Icon className="size-3" /> {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <GapCheckItem key={i} label={item} checked={selectedGaps.has(itemKey(a.assuntoId, tipo, item))} onChange={() => onToggleGap(a.assuntoId, tipo, item)} />
        ))}
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

function GapCheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      className="flex items-start gap-2 cursor-pointer group py-0.5"
      onClick={onChange}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(); } }}
    >
      <div className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded border transition-all ${checked ? "border-primary bg-primary/15" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
        {checked && <CheckIcon className="size-2 text-primary" />}
      </div>
      <span className="text-xs text-muted-foreground leading-snug">{label}</span>
    </div>
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

function CompletenessFooter({ uiStep, selectedCount, onRetry, onGenerate, onClose }: { uiStep: UIStep; selectedCount: number; onRetry: () => void; onGenerate: () => void; onClose: () => void }) {
  return (
    <div className="shrink-0 flex gap-2">
      {(uiStep === "loading" || uiStep === "generating") && (
        <Button className="flex-1" variant="secondary" disabled>
          <Loader2Icon className="size-4 mr-2 animate-spin" />
          Processando...
        </Button>
      )}
      {uiStep === "done" && (
        <>
          <Button variant="outline" className="gap-2" onClick={onRetry}>
            <RefreshCwIcon className="size-4" />
            Regerar
          </Button>
          <Button className="flex-1 gap-2" onClick={onGenerate} disabled={selectedCount === 0}>
            <SparklesIcon className="size-4" />
            Gerar selecionados ({selectedCount})
          </Button>
        </>
      )}
      {(uiStep === "error" || uiStep === "generated") && (
        <>
          {uiStep === "error" && (
            <Button variant="outline" className="gap-2" onClick={onRetry}>
              <RefreshCwIcon className="size-4" />
              Regerar
            </Button>
          )}
          <Button className="flex-1" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </>
      )}
    </div>
  );
}
