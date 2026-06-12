"use client";

import { useState } from "react";
import {
  BoxSelectIcon,
  BracesIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  HandIcon,
  LayersIcon,
  LinkIcon,
  Loader2Icon,
  MousePointer2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GraphTool } from "./GraphRenderer";
import { getNodeColors } from "../services/graph-style.service";
import { NODE_TYPE_DISPLAY } from "../../constants/graph-ui.constants";
import { PRIORITY_MAX, type DegreeFilter, type GraphSearch } from "../hooks/useGraphSearch";

type Props = {
  isDark: boolean;

  tool: GraphTool;
  onToolChange: (tool: GraphTool) => void;

  onOpenCreateNode: () => void;
  onOpenEdgeManager: () => void;
  onOpenImportJson?: () => void;
  onDeleteGraph?: () => void;

  search: GraphSearch;
  onFocusNode: (node: any) => void;

  nodeStats: Record<string, number>;
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
};

const DEGREE_OPTIONS: Array<{ id: DegreeFilter; label: string; title: string }> = [
  { id: "all", label: "Todos", title: "Qualquer nº de conexões" },
  { id: "isolated", label: "Isolados", title: "Sem nenhuma relação" },
  { id: "leaf", label: "Folhas", title: "Exatamente 1 relação" },
  { id: "hub", label: "Hubs", title: "Muito conectados (4+)" },
];

// faixa dupla (mín–máx) com dois sliders e rótulo do intervalo
function RangeFilter({
  label,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onMin,
  onMax,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onMin: (v: number) => void;
  onMax: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="font-mono text-primary">
          {format(valueMin)} – {format(valueMax)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => onMin(Math.min(Number(e.target.value), valueMax))}
        className="w-full accent-[var(--primary)] h-1"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => onMax(Math.max(Number(e.target.value), valueMin))}
        className="w-full accent-[var(--primary)] h-1"
      />
    </div>
  );
}

const TOOLS: Array<{ id: GraphTool; icon: typeof MousePointer2Icon; label: string }> = [
  { id: "select", icon: MousePointer2Icon, label: "Selecionar (V)" },
  { id: "marquee", icon: BoxSelectIcon, label: "Seleção múltipla (M)" },
  { id: "hand", icon: HandIcon, label: "Mover o grafo (H)" },
];

function SideButton({
  label,
  active = false,
  ringed = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  ringed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className={`size-8 text-primary ${active || ringed ? "ring-1 ring-primary/50" : ""}`}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GraphSideToolbar({
  isDark,
  tool,
  onToolChange,
  onOpenCreateNode,
  onOpenEdgeManager,
  onOpenImportJson,
  onDeleteGraph,
  search,
  onFocusNode,
  nodeStats,
  hiddenTypes,
  onToggleType,
}: Props) {
  const [openPanel, setOpenPanel] = useState<"search" | "layers" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const togglePanel = (panel: "search" | "layers") =>
    setOpenPanel((p) => (p === panel ? null : panel));

  const { filters, actions, results, matchedCount, activeCount, loadingContent } = search;
  const availableTypes = Object.keys(nodeStats);

  return (
    <TooltipProvider delay={200}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <div className="graph-toolbar flex flex-col items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
          <SideButton label="Novo nó" onClick={onOpenCreateNode}>
            <PlusIcon className="size-4" />
          </SideButton>
          <SideButton label="Gerenciar relações" onClick={onOpenEdgeManager}>
            <LinkIcon className="size-4" />
          </SideButton>
          {onOpenImportJson && (
            <SideButton label="Importar JSON" onClick={onOpenImportJson}>
              <BracesIcon className="size-4" />
            </SideButton>
          )}

          <div className="h-px w-5 bg-border" />

          {TOOLS.map((t) => (
            <SideButton
              key={t.id}
              label={t.label}
              active={tool === t.id}
              onClick={() => onToolChange(t.id)}
            >
              <t.icon className="size-4" />
            </SideButton>
          ))}

          <div className="h-px w-5 bg-border" />

          <SideButton
            label="Buscar e filtrar nós"
            active={openPanel === "search"}
            ringed={activeCount > 0}
            onClick={() => togglePanel("search")}
          >
            <SearchIcon className="size-4" />
          </SideButton>
          <SideButton
            label="Tipos de nó (camadas)"
            active={openPanel === "layers"}
            ringed={hiddenTypes.size > 0}
            onClick={() => togglePanel("layers")}
          >
            <LayersIcon className="size-4" />
          </SideButton>

          {onDeleteGraph && (
            <>
              <div className="h-px w-5 bg-border" />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={onDeleteGraph}
                    >
                      <Trash2Icon className="size-4 text-red-500" />
                    </Button>
                  }
                />
                <TooltipContent side="right">Apagar grafo</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* PAINEL DE BUSCA + FILTROS */}
        {openPanel === "search" && (
          <div className="graph-toolbar absolute left-full top-0 ml-2 w-72 max-h-[78vh] overflow-y-auto rounded-md border bg-background/95 backdrop-blur-sm p-3 shadow-md">
            {/* texto */}
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por texto..."
                value={filters.query}
                onChange={(e) => actions.setQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {filters.query && (
                <button
                  onClick={() => actions.setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {/* escopo da busca por texto */}
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {([
                ["all", "Tudo"],
                ["title", "Título"],
                ["content", "Conteúdo"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => actions.setTextScope(id)}
                  title={
                    id === "title"
                      ? "Buscar no título/rótulo"
                      : id === "content"
                        ? "Buscar dentro do conteúdo"
                        : "Buscar em título e conteúdo"
                  }
                  className={`rounded px-1 py-1 text-[10px] transition-colors ${
                    filters.textScope === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* cabeçalho dos filtros */}
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <FilterIcon className="size-3.5" />
                Filtros
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </button>
              {activeCount > 0 && (
                <button
                  onClick={actions.clear}
                  className="text-[11px] text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="mt-2 space-y-3 border-t pt-3">
                {/* tipos */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Tipo de nó
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {availableTypes.map((type) => {
                      const on = filters.types.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => actions.toggleType(type)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                            on
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: getNodeColors(type, isDark).border }}
                          />
                          {NODE_TYPE_DISPLAY[type as keyof typeof NODE_TYPE_DISPLAY]?.label ?? type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* domínio */}
                <RangeFilter
                  label="Domínio"
                  min={0}
                  max={100}
                  step={5}
                  valueMin={filters.domainMin}
                  valueMax={filters.domainMax}
                  onMin={actions.setDomainMin}
                  onMax={actions.setDomainMax}
                  format={(v) => `${v}%`}
                />

                {/* prioridade de revisão */}
                <RangeFilter
                  label="Prioridade de revisão"
                  min={0}
                  max={PRIORITY_MAX}
                  step={1}
                  valueMin={filters.priorityMin}
                  valueMax={filters.priorityMax}
                  onMin={actions.setPriorityMin}
                  onMax={actions.setPriorityMax}
                  format={(v) => String(v)}
                />

                {/* conexões (grau) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Conexões
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {DEGREE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        title={opt.title}
                        onClick={() => actions.setDegree(opt.id)}
                        className={`rounded px-1 py-1 text-[10px] transition-colors ${
                          filters.degree === opt.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* resultados */}
            <div className="mt-3 border-t pt-2">
              {loadingContent && (
                <p className="mb-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2Icon className="size-3 animate-spin" />
                  Buscando no conteúdo...
                </p>
              )}
              {activeCount === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-2">
                  Digite um texto ou aplique filtros para destacar nós.
                </p>
              ) : results.length > 0 ? (
                <>
                  <p className="mb-1 text-[11px] text-muted-foreground">
                    {matchedCount} {matchedCount === 1 ? "nó" : "nós"} encontrado
                    {matchedCount === 1 ? "" : "s"}
                    {matchedCount > results.length && ` (mostrando ${results.length})`}
                  </p>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {results.map((node) => {
                      const dom = Math.round((node.dominio ?? 0) * 100);
                      return (
                        <button
                          key={node.id}
                          onClick={() => {
                            onFocusNode(node);
                            setOpenPanel(null);
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                        >
                          <span
                            className="size-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getNodeColors(node.group ?? "", isDark).border }}
                          />
                          <span className="truncate flex-1">{node.label}</span>
                          {dom > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                              {dom}%
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                !loadingContent && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado</p>
                )
              )}
            </div>
          </div>
        )}

        {/* PAINEL DE CAMADAS — desative os tipos que não quer ver */}
        {openPanel === "layers" && (
          <div className="graph-toolbar absolute left-full bottom-0 ml-2 w-60 rounded-md border bg-background/95 backdrop-blur-sm p-3 shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Camadas (tipos de nó)
              </h4>
              {hiddenTypes.size > 0 && (
                <button
                  onClick={() => Object.keys(nodeStats).filter((t) => hiddenTypes.has(t)).forEach(onToggleType)}
                  className="text-[11px] text-primary hover:underline"
                >
                  Mostrar todos
                </button>
              )}
            </div>
            {Object.keys(nodeStats).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum nó no grafo</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(nodeStats).map(([type, count]) => {
                  const hidden = hiddenTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => onToggleType(type)}
                      title={hidden ? "Mostrar este tipo" : "Ocultar este tipo"}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors hover:bg-accent ${
                        hidden ? "opacity-45" : ""
                      }`}
                    >
                      <div
                        className="size-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getNodeColors(type, isDark).border }}
                      />
                      <span className={`flex-1 truncate text-left ${hidden ? "line-through" : ""}`}>
                        {NODE_TYPE_DISPLAY[type as keyof typeof NODE_TYPE_DISPLAY]?.label ?? type}
                      </span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                      {hidden ? (
                        <EyeOffIcon className="size-3.5 text-muted-foreground" />
                      ) : (
                        <EyeIcon className="size-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
