"use client";

import { useMemo } from "react";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  RouteIcon,
  XIcon,
} from "lucide-react";
import {
  buildRoadmap,
  type RoadmapItem,
  type RoadmapStatus,
} from "../../domain/services/roadmap.service";

type Props = {
  open: boolean;
  onClose: () => void;
  nodes: Array<{ id: string; label?: string; group?: string; dominio?: number }>;
  edges: Array<{ source: string; target: string; type?: string; peso?: number }>;
  onFocusNode: (node: { id: string }) => void;
};

const STATUS_STYLE: Record<RoadmapStatus, { icon: typeof CircleIcon; color: string; label: string }> = {
  mastered: { icon: CheckCircle2Icon, color: "text-green-600 dark:text-green-500", label: "Dominado" },
  partial: { icon: CircleDotIcon, color: "text-amber-500", label: "Parcial" },
  todo: { icon: CircleIcon, color: "text-muted-foreground/60", label: "A estudar" },
};

function StatusIcon({ status }: { status: RoadmapStatus }) {
  const { icon: Icon, color } = STATUS_STYLE[status];
  return <Icon className={`size-3.5 shrink-0 ${color}`} />;
}

const pct = (d: number) => `${Math.round(d * 100)}%`;

function ConceptRow({ item, onFocus }: { item: RoadmapItem; onFocus: () => void }) {
  return (
    <button
      onClick={onFocus}
      className="group flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-accent"
      title={item.label}
    >
      <StatusIcon status={item.status} />
      <span className="flex-1 truncate text-muted-foreground group-hover:text-foreground">
        {item.label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{pct(item.dominio)}</span>
    </button>
  );
}

export function RoadmapPanel({ open, onClose, nodes, edges, onFocusNode }: Props) {
  // só calcula quando o painel está aberto
  const roadmap = useMemo(
    () => (open ? buildRoadmap(nodes, edges) : { sections: [], total: 0, mastered: 0 }),
    [open, nodes, edges],
  );

  if (!open) return null;

  const progress = roadmap.total > 0 ? roadmap.mastered / roadmap.total : 0;

  return (
    <div className="graph-toolbar absolute left-16 top-3 bottom-3 z-20 flex w-[360px] max-w-[calc(100%-5rem)] flex-col rounded-md border bg-background/95 backdrop-blur-sm shadow-lg">
      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <RouteIcon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Roadmap de estudo</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title="Fechar">
          <XIcon className="size-4" />
        </button>
      </div>

      {/* progresso + legenda */}
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {roadmap.mastered} de {roadmap.total} dominados
          </span>
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

      {/* trilha */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {roadmap.sections.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Nenhum tópico ou conceito para montar o roadmap ainda.
          </p>
        ) : (
          <div className="space-y-5">
            {roadmap.sections.map((section) => (
              <div key={section.id}>
                {/* seção (assunto) */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-full bg-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    {section.label}
                  </h4>
                </div>

                {/* espinha de tópicos */}
                <div className="relative pl-7">
                  <div className="absolute left-[0.6rem] top-1 bottom-1 w-px bg-border" />
                  {section.topics.map((topic, i) => (
                    <div key={topic.id} className="relative mb-3 last:mb-0">
                      {/* badge numerado na espinha */}
                      <span className="absolute -left-[1.55rem] top-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      {/* card do tópico */}
                      <button
                        onClick={() => onFocusNode({ id: topic.id })}
                        className="flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left text-sm hover:border-primary"
                        title={topic.label}
                      >
                        <StatusIcon status={topic.status} />
                        <span className="flex-1 truncate font-medium">{topic.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {pct(topic.dominio)}
                        </span>
                      </button>
                      {/* ramos: conceitos */}
                      {topic.concepts.length > 0 && (
                        <div className="mt-1 ml-1 space-y-0.5 border-l pl-2">
                          {topic.concepts.map((c) => (
                            <ConceptRow key={c.id} item={c} onFocus={() => onFocusNode({ id: c.id })} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* conceitos soltos (sem tópico) */}
                  {section.looseConcepts.length > 0 && (
                    <div className="ml-1 space-y-0.5 border-l pl-2">
                      {section.looseConcepts.map((c) => (
                        <ConceptRow key={c.id} item={c} onFocus={() => onFocusNode({ id: c.id })} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
