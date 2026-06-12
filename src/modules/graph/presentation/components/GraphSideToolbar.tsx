"use client";

import { useState } from "react";
import {
  BoxSelectIcon,
  BracesIcon,
  EyeIcon,
  EyeOffIcon,
  HandIcon,
  LayersIcon,
  LinkIcon,
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

type Props = {
  isDark: boolean;

  tool: GraphTool;
  onToolChange: (tool: GraphTool) => void;

  onOpenCreateNode: () => void;
  onOpenEdgeManager: () => void;
  onOpenImportJson?: () => void;
  onDeleteGraph?: () => void;

  searchQuery: string;
  onSearchChange: (query: string) => void;
  // nós do layout: o tipo vem em `group` (SimNode) ou `type` (raw)
  searchResults: Array<{ id: string; label: string; type?: string; group?: string }>;
  onFocusNode: (node: any) => void;

  nodeStats: Record<string, number>;
  hiddenTypes: Set<string>;
  onToggleType: (type: string) => void;
};

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
  searchQuery,
  onSearchChange,
  searchResults,
  onFocusNode,
  nodeStats,
  hiddenTypes,
  onToggleType,
}: Props) {
  const [openPanel, setOpenPanel] = useState<"search" | "layers" | null>(null);

  const togglePanel = (panel: "search" | "layers") =>
    setOpenPanel((p) => (p === panel ? null : panel));

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
            label="Buscar nós"
            active={openPanel === "search"}
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

        {/* PAINEL DE BUSCA */}
        {openPanel === "search" && (
          <div className="graph-toolbar absolute left-full top-0 ml-2 w-64 rounded-md border bg-background/95 backdrop-blur-sm p-3 shadow-md">
            <div className="relative mb-2">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar nós..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      onFocusNode(node);
                      setOpenPanel(null);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div
                      className="size-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: getNodeColors(node.type ?? node.group ?? "", isDark).border,
                      }}
                    />
                    <span className="truncate">{node.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              searchQuery && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado</p>
              )
            )}
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
