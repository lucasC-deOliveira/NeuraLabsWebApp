"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  RouteIcon,
  ClipboardListIcon,
  XIcon,
  Loader2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ClockIcon,
  SparklesIcon,
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
import type { RoadmapMode, RoadmapStep } from "../../application/ports/graph-ai.port";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  grafoId: string;
  nodes: Array<{ id: string; label?: string; group?: string; dominio?: number }>;
  edges: Array<{ source: string; target: string; type?: string; peso?: number }>;
  // PROVA / EDITAL nodes in the graph, to scope the prova/edital roadmap modes when
  // the graph has more than one (a graph may have several of each).
  provas: Array<{ id: string; label: string }>;
  editais: Array<{ id: string; label: string }>;
  onFocusNode: (node: { id: string }) => void;
};

const PROVA_MODES: Mode[] = ["prova", "prova_edital"];
const EDITAL_MODES: Mode[] = ["edital", "prova_edital"];

// "urgency" is computed locally from the graph; the others are server-persisted and
// recomputed incrementally (only new nodes are re-slotted).
type Mode = "urgency" | RoadmapMode;

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: "urgency", label: "Por urgência" },
  { value: "ai", label: "Prioridade IA" },
  { value: "prova", label: "Por prova" },
  { value: "edital", label: "Por edital" },
  { value: "prova_edital", label: "Prova + edital" },
];

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

function ModeSelect({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <SparklesIcon className="size-3.5 shrink-0 text-primary" />
      <select
        value={mode}
        onChange={(e) => onMode(e.target.value as Mode)}
        className="flex-1 rounded-md border bg-background text-foreground px-2 py-1 text-xs font-medium"
      >
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// Scopes an edital/prova roadmap mode to one item (or "all"), when the graph has many.
function ScopeSelect({ Icon, iconClass, allLabel, items, value, onChange }: {
  Icon: typeof RouteIcon;
  iconClass: string;
  allLabel: string;
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <Icon className={`size-3.5 shrink-0 ${iconClass}`} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border bg-background text-foreground px-2 py-1 text-xs"
      >
        <option value="">{allLabel}</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>{it.label}</option>
        ))}
      </select>
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

function Banner({ text, tone }: { text: string; tone: "warn" | "info" }) {
  const cls = tone === "warn"
    ? "bg-amber-500/8 text-amber-700 dark:text-amber-400"
    : "bg-primary/8 text-primary";
  const Icon = tone === "warn" ? TriangleAlertIcon : SparklesIcon;
  return (
    <div className={`border-b px-3 py-1.5 flex items-start gap-2 ${cls}`}>
      <Icon className="size-3.5 shrink-0 mt-0.5" />
      <p className="text-[11px] leading-snug">{text}</p>
    </div>
  );
}

function ServerMeta({ generatedAt, onRegen }: { generatedAt: string | null; onRegen: () => void }) {
  return (
    <div className="border-b px-3 py-1.5 flex items-center gap-2">
      <ClockIcon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground flex-1">
        Atualizada {generatedAt ? formatRelativeTime(generatedAt) : ""}
      </span>
      <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={onRegen}>
        <RefreshCwIcon className="size-3" /> Regerar
      </button>
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

function LoadingView() {
  return (
    <div className="flex flex-col items-center gap-3 py-14">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Priorizando os nós...</p>
    </div>
  );
}

function StepCard({ step, index, active, onGo }: { step: RoadmapStep; index: number; active: boolean; onGo: () => void }) {
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
        {step.provaFreq !== undefined && step.provaFreq > 0 && (
          <span
            className="shrink-0 rounded-full bg-orange-500/12 px-1.5 py-0 text-[10px] font-medium tabular-nums text-orange-600 dark:text-orange-400"
            title={`Já caiu em ${step.provaFreq} questão(ões) de prova`}
          >
            🔥 {step.provaFreq}
          </span>
        )}
      </div>
      {step.motivo && <p className="text-[11px] text-muted-foreground leading-snug ml-7">{step.motivo}</p>}
    </button>
  );
}

function StepList({ loading, error, steps, currentStep, onRetry, onGo }: {
  loading: boolean;
  error: string;
  steps: RoadmapStep[];
  currentStep: number;
  onRetry: () => void;
  onGo: (idx: number) => void;
}) {
  if (loading) return <LoadingView />;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RefreshCwIcon className="size-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }
  if (steps.length === 0) {
    return <p className="py-10 text-center text-xs text-muted-foreground">Nenhum conceito para priorizar. Adicione mais nós ao grafo.</p>;
  }
  return (
    <div className="space-y-2">
      {steps.map((step, i) => <StepCard key={step.nodeId} step={step} index={i} active={i === currentStep} onGo={() => onGo(i)} />)}
    </div>
  );
}

interface ServerPanelProps {
  loading: boolean;
  error: string;
  steps: RoadmapStep[];
  currentStep: number;
  generatedAt: string | null;
  novos: number;
  staleCount: number;
  onRegen: () => void;
  onGo: (idx: number) => void;
}

function novosText(n: number): string {
  const s = n > 1 ? "s" : "";
  return `${n} novo${s} priorizado${s} e encaixado${s} na trilha.`;
}

function staleText(n: number): string {
  return n > 1
    ? `${n} passos não estão mais no grafo e foram ocultados.`
    : `${n} passo não está mais no grafo e foi ocultado.`;
}

function ServerBanners({ novos, staleCount }: { novos: number; staleCount: number }) {
  return (
    <>
      {novos > 0 && <Banner tone="info" text={novosText(novos)} />}
      {staleCount > 0 && <Banner tone="warn" text={staleText(staleCount)} />}
    </>
  );
}

function ServerPanel(p: ServerPanelProps) {
  const ready = !p.loading && !p.error;
  const hasSteps = p.steps.length > 0;
  return (
    <>
      {ready && hasSteps && <ServerMeta generatedAt={p.generatedAt} onRegen={p.onRegen} />}
      {ready && <ServerBanners novos={p.novos} staleCount={p.staleCount} />}
      {ready && hasSteps && <StepNav currentStep={p.currentStep} total={p.steps.length} onGo={p.onGo} />}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <StepList loading={p.loading} error={p.error} steps={p.steps} currentStep={p.currentStep} onRetry={p.onRegen} onGo={p.onGo} />
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RoadmapPanel({ open, onClose, grafoId, nodes, edges, provas, editais, onFocusNode }: Props) {
  const [mode, setMode] = useState<Mode>("urgency");
  const [provaId, setProvaId] = useState("");
  const [editalId, setEditalId] = useState("");
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [novos, setNovos] = useState(0);
  const [prevGrafoId, setPrevGrafoId] = useState<string | null>(null);

  const provaScoped = PROVA_MODES.includes(mode);
  const editalScoped = EDITAL_MODES.includes(mode);
  const validNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const validSteps = useMemo(() => steps.filter((s) => validNodeIds.has(s.nodeId)), [steps, validNodeIds]);
  const staleCount = steps.length - validSteps.length;

  // Reseta ao trocar de grafo — durante render (evita set-state-in-effect).
  if (grafoId !== prevGrafoId) {
    setPrevGrafoId(grafoId);
    setSteps([]); setGeneratedAt(null); setNovos(0); setCurrentStep(0); setError("");
  }

  const fetchRoadmap = useCallback(async (m: RoadmapMode, regenerate: boolean): Promise<void> => {
    setLoading(true); setError(""); setCurrentStep(0);
    try {
      const scopedProva = PROVA_MODES.includes(m) ? provaId || undefined : undefined;
      const scopedEdital = EDITAL_MODES.includes(m) ? editalId || undefined : undefined;
      const res = await graphHttp.buildRoadmap(grafoId, m, { regenerate, provaId: scopedProva, editalId: scopedEdital });
      setSteps(res.itens); setGeneratedAt(res.dataGeracao); setNovos(res.novos);
      const first = res.itens.find((s) => validNodeIds.has(s.nodeId));
      if (first) onFocusNode({ id: first.nodeId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao montar o roadmap.");
    } finally {
      setLoading(false);
    }
  }, [grafoId, provaId, editalId, validNodeIds, onFocusNode]);

  // Ao abrir/trocar de modo, prova ou edital: busca (o servidor persiste e recalcula só o delta).
  useEffect(() => {
    if (!open || mode === "urgency") return;
    queueMicrotask(() => { void fetchRoadmap(mode, false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, grafoId, provaId, editalId]);

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
      <ModeSelect mode={mode} onMode={setMode} />
      {provaScoped && provas.length > 1 && (
        <ScopeSelect
          Icon={ClipboardListIcon}
          iconClass="text-amber-500"
          allLabel="Todas as provas"
          items={provas}
          value={provaId}
          onChange={setProvaId}
        />
      )}
      {editalScoped && editais.length > 1 && (
        <ScopeSelect
          Icon={RouteIcon}
          iconClass="text-teal-500"
          allLabel="Todos os editais"
          items={editais}
          value={editalId}
          onChange={setEditalId}
        />
      )}
      {mode === "urgency" ? (
        <UrgencyPanel roadmap={roadmap} onFocusNode={onFocusNode} />
      ) : (
        <ServerPanel
          loading={loading}
          error={error}
          steps={validSteps}
          currentStep={currentStep}
          generatedAt={generatedAt}
          novos={novos}
          staleCount={staleCount}
          onRegen={() => fetchRoadmap(mode, true)}
          onGo={goToStep}
        />
      )}
    </div>
  );
}
