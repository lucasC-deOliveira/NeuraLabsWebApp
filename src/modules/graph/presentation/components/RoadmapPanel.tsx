"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  RouteIcon,
  XIcon,
  SparklesIcon,
  Loader2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  ClockIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  buildRoadmap,
  type RoadmapItem,
  type RoadmapStatus,
  type RoadmapSection,
  type RoadmapTopic,
  type RoadmapData,
} from "../../domain/services/roadmap.service";
import { graphHttp } from "../../infra/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  grafoId: string;
  nodes: Array<{ id: string; label?: string; group?: string; dominio?: number }>;
  edges: Array<{ source: string; target: string; type?: string; peso?: number }>;
  onFocusNode: (node: { id: string }) => void;
};

type AIStep = { nodeId: string; nome: string; tipo: string; motivo: string };
type Mode = "urgency" | "ai";

interface SavedTrail {
  steps: AIStep[];
  generatedAt: string; // ISO
  nodeCount: number; // para detectar grafo desatualizado
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function trailKey(grafoId: string): string {
  return `neuralabs:trail:${grafoId}`;
}

function loadSavedTrail(grafoId: string): SavedTrail | null {
  try {
    const raw = localStorage.getItem(trailKey(grafoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedTrail;
    if (!Array.isArray(parsed.steps) || !parsed.generatedAt) return null; // valida shape mínima
    return parsed;
  } catch {
    return null;
  }
}

function saveTrail(grafoId: string, trail: SavedTrail): boolean {
  try {
    localStorage.setItem(trailKey(grafoId), JSON.stringify(trail));
    return true;
  } catch {
    return false; // QuotaExceededError ou outro erro de storage
  }
}

function clearSavedTrail(grafoId: string): void {
  try { localStorage.removeItem(trailKey(grafoId)); } catch { /* ignore */ }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

const STATUS_STYLE: Record<RoadmapStatus, { icon: typeof CircleIcon; color: string; label: string }> = {
  mastered: { icon: CheckCircle2Icon, color: "text-green-600 dark:text-green-500", label: "Dominado" },
  partial: { icon: CircleDotIcon, color: "text-amber-500", label: "Parcial" },
  todo: { icon: CircleIcon, color: "text-muted-foreground/60", label: "A estudar" },
};

const TYPE_COLOR: Record<string, string> = {
  ASSUNTO: "text-blue-500",
  TOPICO: "text-purple-500",
  CONCEITO: "text-green-500",
};

function StatusIcon({ status }: { status: RoadmapStatus }) {
  const { icon: Icon, color } = STATUS_STYLE[status];
  return <Icon className={`size-3.5 shrink-0 ${color}`} />;
}

const pct = (d: number): string => `${Math.round(d * 100)}%`;

function ConceptRow({ item, onFocus }: { item: RoadmapItem; onFocus: () => void }) {
  return (
    <button onClick={onFocus} className="group flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent">
      <StatusIcon status={item.status} />
      <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground">{item.label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{pct(item.dominio)}</span>
    </button>
  );
}

function RoadmapHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-2">
        <RouteIcon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Roadmap de estudo</h3>
      </div>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

function ModeToggle({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="flex border-b">
      <button
        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${mode === "urgency" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => onMode("urgency")}
      >
        Por urgência
      </button>
      <button
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${mode === "ai" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => onMode("ai")}
      >
        <SparklesIcon className="size-3" />
        Trilha IA
      </button>
    </div>
  );
}

function UrgencyProgress({ mastered, total, progress }: { mastered: number; total: number; progress: number }) {
  return (
    <div className="border-b px-3 py-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{mastered} de {total} dominados</span>
        <span className="font-mono text-primary">{pct(progress)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: pct(progress) }} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        {(["mastered", "partial", "todo"] as RoadmapStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <StatusIcon status={s} />
            {STATUS_STYLE[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopicNode({ topic, index, onFocusNode }: { topic: RoadmapTopic; index: number; onFocusNode: (node: { id: string }) => void }) {
  return (
    <div className="relative mb-3 last:mb-0">
      <span className="absolute -left-[1.55rem] top-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-[10px] font-bold text-primary">
        {index + 1}
      </span>
      <button
        onClick={() => onFocusNode({ id: topic.id })}
        className="flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left text-sm hover:border-primary"
      >
        <StatusIcon status={topic.status} />
        <span className="flex-1 truncate font-medium">{topic.label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{pct(topic.dominio)}</span>
      </button>
      {topic.concepts.length > 0 && (
        <div className="mt-1 ml-1 space-y-0.5 border-l pl-2">
          {topic.concepts.map((c) => <ConceptRow key={c.id} item={c} onFocus={() => onFocusNode({ id: c.id })} />)}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section, onFocusNode }: { section: RoadmapSection; onFocusNode: (node: { id: string }) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-primary" />
        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">{section.label}</h4>
      </div>
      <div className="relative pl-7">
        <div className="absolute left-[0.6rem] top-1 bottom-1 w-px bg-border" />
        {section.topics.map((topic, i) => <TopicNode key={topic.id} topic={topic} index={i} onFocusNode={onFocusNode} />)}
        {section.looseConcepts.length > 0 && (
          <div className="ml-1 space-y-0.5 border-l pl-2">
            {section.looseConcepts.map((c) => <ConceptRow key={c.id} item={c} onFocus={() => onFocusNode({ id: c.id })} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function UrgencyPanel({ roadmap, onFocusNode }: { roadmap: RoadmapData; onFocusNode: (node: { id: string }) => void }) {
  const progress = roadmap.total > 0 ? roadmap.mastered / roadmap.total : 0;
  return (
    <>
      <UrgencyProgress mastered={roadmap.mastered} total={roadmap.total} progress={progress} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {roadmap.sections.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Nenhum tópico ou conceito para montar o roadmap ainda.</p>
        ) : (
          <div className="space-y-5">
            {roadmap.sections.map((section) => <SectionBlock key={section.id} section={section} onFocusNode={onFocusNode} />)}
          </div>
        )}
      </div>
    </>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="border-b px-3 py-1.5 flex items-start gap-2 bg-amber-500/8">
      <TriangleAlertIcon className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">{text}</p>
    </div>
  );
}

interface AiTrailActions {
  onSave: () => void;
  onDelete: () => void;
  onRegen: () => void;
}

function SavedMeta({ generatedAt, onDelete, onRegen }: { generatedAt: string | null } & Pick<AiTrailActions, "onDelete" | "onRegen">) {
  return (
    <>
      <SaveIcon className="size-3 text-green-500 shrink-0" />
      <span className="text-[11px] text-muted-foreground flex-1">Salva {generatedAt ? formatRelativeTime(generatedAt) : ""}</span>
      <button className="text-[11px] text-destructive/70 hover:text-destructive" onClick={onDelete} title="Remover trilha salva">Remover</button>
      <span className="text-muted-foreground/30">·</span>
      <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={onRegen}>
        <RefreshCwIcon className="size-3" /> Regerar
      </button>
    </>
  );
}

function UnsavedMeta({ generatedAt, saveFailed, onSave, onRegen }: { generatedAt: string | null; saveFailed: boolean } & Pick<AiTrailActions, "onSave" | "onRegen">) {
  return (
    <>
      <ClockIcon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground flex-1">Gerada {generatedAt ? formatRelativeTime(generatedAt) : ""}</span>
      {saveFailed ? (
        <span className="text-[10px] text-destructive flex items-center gap-1"><SaveIcon className="size-3" /> Falha ao salvar</span>
      ) : (
        <button className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80" onClick={onSave}>
          <SaveIcon className="size-3" /> Salvar trilha
        </button>
      )}
      <span className="text-muted-foreground/30">·</span>
      <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={onRegen}>
        <RefreshCwIcon className="size-3" /> Regerar
      </button>
    </>
  );
}

function AiTrailMeta({ isSaved, generatedAt, saveFailed, actions }: { isSaved: boolean; generatedAt: string | null; saveFailed: boolean; actions: AiTrailActions }) {
  return (
    <div className="border-b px-3 py-1.5 flex items-center gap-2">
      {isSaved
        ? <SavedMeta generatedAt={generatedAt} onDelete={actions.onDelete} onRegen={actions.onRegen} />
        : <UnsavedMeta generatedAt={generatedAt} saveFailed={saveFailed} onSave={actions.onSave} onRegen={actions.onRegen} />}
    </div>
  );
}

function StepNav({ currentStep, total, onGo }: { currentStep: number; total: number; onGo: (idx: number) => void }) {
  return (
    <div className="border-b px-3 py-1.5 flex items-center gap-2">
      <button
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
        disabled={currentStep === 0}
        onClick={() => onGo(currentStep - 1)}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
        Passo <span className="font-semibold text-foreground">{currentStep + 1}</span> de {total}
      </span>
      <button
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
        disabled={currentStep === total - 1}
        onClick={() => onGo(currentStep + 1)}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}

function AiLoadingView() {
  return (
    <div className="space-y-4 py-6 px-1">
      <div className="flex items-start gap-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 mt-0.5 shrink-0">
          <Loader2Icon className="size-3.5 animate-spin text-primary" />
        </span>
        <div>
          <p className="text-sm font-medium">Gerando trilha com IA</p>
          <p className="text-xs text-muted-foreground mt-0.5">Analisando dependências e nível de domínio...</p>
        </div>
      </div>
      <div className="flex items-start gap-3 opacity-40">
        <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs text-muted-foreground font-medium mt-0.5 shrink-0">2</span>
        <p className="text-sm font-medium text-muted-foreground">Apresentar trilha ordenada</p>
      </div>
    </div>
  );
}

function AiStepCard({ step, index, active, onGo }: { step: AIStep; index: number; active: boolean; onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${active ? "border-primary/50 bg-primary/8" : "border-border hover:border-primary/30 hover:bg-accent/50"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {index + 1}
        </span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLOR[step.tipo] ?? "text-foreground"}`}>
          {step.tipo.toLowerCase()}
        </Badge>
        <span className="text-sm font-medium truncate flex-1">{step.nome}</span>
      </div>
      {step.motivo && <p className="text-[11px] text-muted-foreground leading-snug ml-7">{step.motivo}</p>}
    </button>
  );
}

function AiTrailContent({ aiLoading, aiError, steps, currentStep, onRetry, onGo }: {
  aiLoading: boolean;
  aiError: string;
  steps: AIStep[];
  currentStep: number;
  onRetry: () => void;
  onGo: (idx: number) => void;
}) {
  if (aiLoading) return <AiLoadingView />;
  if (aiError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{aiError}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RefreshCwIcon className="size-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }
  if (steps.length === 0) {
    return <p className="py-10 text-center text-xs text-muted-foreground">Nenhum passo gerado. Adicione mais nós ao grafo.</p>;
  }
  return (
    <div className="space-y-2">
      {steps.map((step, i) => <AiStepCard key={step.nodeId} step={step} index={i} active={i === currentStep} onGo={() => onGo(i)} />)}
    </div>
  );
}

interface AiPanelProps {
  aiLoading: boolean;
  aiError: string;
  steps: AIStep[];
  currentStep: number;
  isSaved: boolean;
  generatedAt: string | null;
  saveFailed: boolean;
  staleCount: number;
  graphChanged: boolean;
  actions: AiTrailActions;
  onRetry: () => void;
  onGo: (idx: number) => void;
}

function AiPanel(p: AiPanelProps) {
  const ready = !p.aiLoading;
  const hasSteps = p.steps.length > 0;
  return (
    <>
      {ready && hasSteps && <AiTrailMeta isSaved={p.isSaved} generatedAt={p.generatedAt} saveFailed={p.saveFailed} actions={p.actions} />}
      {ready && hasSteps && p.graphChanged && <Warning text="O grafo mudou desde a última geração. Regenerar pode melhorar a trilha." />}
      {ready && p.staleCount > 0 && (
        <Warning text={`${p.staleCount} passo${p.staleCount > 1 ? "s foram removidos" : " foi removido"} do grafo e ocultado${p.staleCount > 1 ? "s" : ""}.`} />
      )}
      {ready && hasSteps && <StepNav currentStep={p.currentStep} total={p.steps.length} onGo={p.onGo} />}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AiTrailContent aiLoading={p.aiLoading} aiError={p.aiError} steps={p.steps} currentStep={p.currentStep} onRetry={p.onRetry} onGo={p.onGo} />
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RoadmapPanel({ open, onClose, grafoId, nodes, edges, onFocusNode }: Props) {
  const [mode, setMode] = useState<Mode>("urgency");
  const [aiSteps, setAiSteps] = useState<AIStep[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [savedNodeCount, setSavedNodeCount] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false); // trilha veio do storage ou foi salva
  const [saveFailed, setSaveFailed] = useState(false);
  const [prevGrafoId, setPrevGrafoId] = useState<string | null>(null);

  const relevantNodeCount = nodes.filter((n) => n.group === "ASSUNTO" || n.group === "TOPICO" || n.group === "CONCEITO").length;
  const validNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const validSteps = useMemo(() => aiSteps.filter((s) => validNodeIds.has(s.nodeId)), [aiSteps, validNodeIds]);
  const staleCount = aiSteps.length - validSteps.length;
  const graphChanged = isSaved && savedNodeCount !== null && relevantNodeCount > 0 &&
    Math.abs(relevantNodeCount - savedNodeCount) / Math.max(savedNodeCount, 1) > 0.2;

  // Reseta a IA ao trocar de grafo — durante render (evita set-state-in-effect).
  if (grafoId !== prevGrafoId) {
    setPrevGrafoId(grafoId);
    setAiSteps([]); setGeneratedAt(null); setSavedNodeCount(null);
    setCurrentStep(0); setAiError(""); setIsSaved(false); setSaveFailed(false);
  }

  const loadSaved = useCallback((): boolean => {
    const saved = loadSavedTrail(grafoId);
    if (!saved) return false;
    setAiSteps(saved.steps); setGeneratedAt(saved.generatedAt); setSavedNodeCount(saved.nodeCount);
    setCurrentStep(0); setAiError(""); setIsSaved(true); setSaveFailed(false);
    return true;
  }, [grafoId]);

  const fetchAiTrail = useCallback(async (): Promise<void> => {
    if (aiLoading) return; // previne fetch duplicado
    setAiLoading(true); setAiError(""); setIsSaved(false); setSaveFailed(false); setCurrentStep(0);
    try {
      const res = await graphHttp.generateLearningPath(grafoId);
      setAiSteps(res.steps); setGeneratedAt(new Date().toISOString()); setSavedNodeCount(relevantNodeCount);
      const firstValid = res.steps.find((s) => validNodeIds.has(s.nodeId));
      if (firstValid) onFocusNode({ id: firstValid.nodeId });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Erro ao gerar trilha.");
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, grafoId, relevantNodeCount, validNodeIds, onFocusNode]);

  // Ao abrir o modo IA: carrega do storage; só busca da IA se não houver trilha salva.
  // queueMicrotask evita setState síncrono no effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (mode !== "ai" || !open) return;
    queueMicrotask(() => { if (!loadSaved() && !aiLoading) fetchAiTrail(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, grafoId]);

  const handleSave = (): void => {
    if (!aiSteps.length || !generatedAt) return;
    const ok = saveTrail(grafoId, { steps: aiSteps, generatedAt, nodeCount: relevantNodeCount });
    setIsSaved(ok);
    setSaveFailed(!ok);
  };

  const handleDeleteSaved = (): void => {
    clearSavedTrail(grafoId);
    setIsSaved(false); setAiSteps([]); setGeneratedAt(null); setSavedNodeCount(null); setCurrentStep(0);
  };

  const goToStep = (idx: number): void => {
    const step = validSteps[idx];
    if (!step) return;
    setCurrentStep(idx);
    onFocusNode({ id: step.nodeId });
  };

  const roadmap = useMemo(
    () => (open ? buildRoadmap(nodes, edges) : { sections: [], total: 0, mastered: 0 }),
    [open, nodes, edges],
  );

  if (!open) return null;

  return (
    <div className="graph-toolbar absolute left-16 top-3 bottom-3 z-20 flex w-[360px] max-w-[calc(100%-5rem)] flex-col rounded-md border bg-background/95 backdrop-blur-sm shadow-lg">
      <RoadmapHeader onClose={onClose} />
      <ModeToggle mode={mode} onMode={setMode} />
      {mode === "urgency" ? (
        <UrgencyPanel roadmap={roadmap} onFocusNode={onFocusNode} />
      ) : (
        <AiPanel
          aiLoading={aiLoading}
          aiError={aiError}
          steps={validSteps}
          currentStep={currentStep}
          isSaved={isSaved}
          generatedAt={generatedAt}
          saveFailed={saveFailed}
          staleCount={staleCount}
          graphChanged={graphChanged}
          actions={{ onSave: handleSave, onDelete: handleDeleteSaved, onRegen: fetchAiTrail }}
          onRetry={fetchAiTrail}
          onGo={goToStep}
        />
      )}
    </div>
  );
}
