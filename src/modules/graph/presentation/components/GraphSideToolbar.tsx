"use client";

import { useState } from "react";
import {
  BoxSelectIcon,
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
import type { GraphTool } from "./GraphRenderer";
import { getNodeColors } from "../services/graph-style.service";
import { NODE_TYPE_DISPLAY } from "../../constants/graph-ui.constants";

type Props = {
  isDark: boolean;

  tool: GraphTool;
  onToolChange: (tool: GraphTool) => void;

  onOpenCreateNode: () => void;
  onOpenEdgeManager: () => void;
  onDeleteGraph?: () => void;

  searchQuery: string;
  onSearchChange: (query: string) => void;
  // nós do layout: o tipo vem em `group` (SimNode) ou `type` (raw)
  searchResults: Array<{ id: string; label: string; type?: string; group?: string }>;
  onFocusNode: (node: any) => void;

  nodeStats: Record<string, number>;
  filterGroup: string | null;
  onToggleFilter: (type: string | null) => void;
};

const TOOLS: Array<{ id: GraphTool; icon: typeof MousePointer2Icon; title: string }> = [
  { id: "select", icon: MousePointer2Icon, title: "Selecionar (V)" },
  { id: "marquee", icon: BoxSelectIcon, title: "Seleção múltipla (M)" },
  { id: "hand", icon: HandIcon, title: "Mover o grafo (H)" },
];

export function GraphSideToolbar({
  isDark,
  tool,
  onToolChange,
  onOpenCreateNode,
  onOpenEdgeManager,
  onDeleteGraph,
  searchQuery,
  onSearchChange,
  searchResults,
  onFocusNode,
  nodeStats,
  filterGroup,
  onToggleFilter,
}: Props) {
  const [openPanel, setOpenPanel] = useState<"search" | "layers" | null>(null);

  const togglePanel = (panel: "search" | "layers") =>
    setOpenPanel((p) => (p === panel ? null : panel));

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
      <div className="graph-toolbar flex flex-col items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary"
          onClick={onOpenCreateNode}
          title="Novo nó"
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary"
          onClick={onOpenEdgeManager}
          title="Gerenciar relações"
        >
          <LinkIcon className="size-4" />
        </Button>

        <div className="h-px w-5 bg-border" />

        {TOOLS.map((t) => (
          <Button
            key={t.id}
            variant={tool === t.id ? "secondary" : "ghost"}
            size="icon"
            className={`size-8 text-primary ${tool === t.id ? "ring-1 ring-primary/50" : ""}`}
            onClick={() => onToolChange(t.id)}
            title={t.title}
          >
            <t.icon className="size-4" />
          </Button>
        ))}

        <div className="h-px w-5 bg-border" />

        <Button
          variant={openPanel === "search" ? "secondary" : "ghost"}
          size="icon"
          className="size-8 text-primary"
          onClick={() => togglePanel("search")}
          title="Buscar nós"
        >
          <SearchIcon className="size-4" />
        </Button>
        <Button
          variant={openPanel === "layers" ? "secondary" : "ghost"}
          size="icon"
          className={`size-8 text-primary ${filterGroup ? "ring-1 ring-primary/50" : ""}`}
          onClick={() => togglePanel("layers")}
          title="Tipos de nó (filtro)"
        >
          <LayersIcon className="size-4" />
        </Button>

        {onDeleteGraph && (
          <>
            <div className="h-px w-5 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onDeleteGraph}
              title="Apagar grafo"
            >
              <Trash2Icon className="size-4 text-red-500" />
            </Button>
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

      {/* PAINEL DE CAMADAS / FILTRO */}
      {openPanel === "layers" && (
        <div className="graph-toolbar absolute left-full bottom-0 ml-2 w-56 rounded-md border bg-background/95 backdrop-blur-sm p-3 shadow-md">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Tipos de nó
          </h4>
          {Object.keys(nodeStats).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum nó no grafo</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(nodeStats).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => onToggleFilter(type === filterGroup ? null : type)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                    type === filterGroup ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  }`}
                >
                  <div
                    className="size-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getNodeColors(type, isDark).border }}
                  />
                  <span className="flex-1 truncate text-left">
                    {NODE_TYPE_DISPLAY[type as keyof typeof NODE_TYPE_DISPLAY]?.label ?? type}
                  </span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
