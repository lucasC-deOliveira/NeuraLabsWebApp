"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  LinkIcon,
  SearchIcon,
  LayersIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  Trash2Icon,
  MousePointer2Icon,
  BoxSelectIcon,
  HandIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { GraphTool } from "@/modules/graph/presentation/components/GraphRenderer";

interface LeftSidebarProps {
  // Tools
  onOpenCreateNode: () => void;
  onOpenEdgeManager: () => void;
  onDeleteGraph?: () => void;

  // Graph interaction tools (Figma-style)
  tool?: GraphTool;
  onToolChange?: (tool: GraphTool) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Array<{ id: string; label: string; type: string }>;
  onFocusNode: (node: any) => void;

  // Layers/Stats
  nodeStats: Record<string, number>;
  filterGroup: string | null;
  onToggleFilter: (type: string) => void;
  getNodeColor: (type: string) => string;
  getTypeLabel: (type: string) => string;

  // Collapsible
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function LeftSidebar({
  onOpenCreateNode,
  onOpenEdgeManager,
  onDeleteGraph,
  tool,
  onToolChange,
  searchQuery,
  onSearchChange,
  searchResults,
  onFocusNode,
  nodeStats,
  filterGroup,
  onToggleFilter,
  getNodeColor,
  getTypeLabel,
  collapsed,
  onToggleCollapse,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<"tools" | "search" | "layers">("tools");

  if (collapsed) {
    return (
      <div className="w-10 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-2 gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveTab("tools")} title="Ferramentas">
          <SettingsIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveTab("search")} title="Buscar">
          <SearchIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveTab("layers")} title="Camadas">
          <LayersIcon className="size-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse} title="Expandir">
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: "tools", icon: SettingsIcon, label: "Ferramentas" },
          { id: "search", icon: SearchIcon, label: "Buscar" },
          { id: "layers", icon: LayersIcon, label: "Camadas" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-1 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title={tab.label}
          >
            <tab.icon className="size-4 mx-auto" />
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "tools" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Ferramentas</h3>
            <Button onClick={onOpenCreateNode} className="w-full justify-start gap-2">
              <PlusIcon className="size-4" />
              Novo Nó
            </Button>
            {tool && onToolChange && (
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: "select", icon: MousePointer2Icon, title: "Selecionar (V)" },
                    { id: "marquee", icon: BoxSelectIcon, title: "Seleção múltipla (M)" },
                    { id: "hand", icon: HandIcon, title: "Mover o grafo (H)" },
                  ] as const
                ).map((t) => (
                  <Button
                    key={t.id}
                    variant={tool === t.id ? "secondary" : "outline"}
                    size="icon"
                    className={`w-full h-8 ${tool === t.id ? "ring-1 ring-primary/50" : ""}`}
                    onClick={() => onToolChange(t.id)}
                    title={t.title}
                  >
                    <t.icon className="size-4" />
                  </Button>
                ))}
              </div>
            )}
            <Button onClick={onOpenEdgeManager} variant="outline" className="w-full justify-start gap-2">
              <LinkIcon className="size-4" />
              Gerenciar Relações
            </Button>
            {onDeleteGraph && (
              <Button onClick={onDeleteGraph} variant="destructive" className="w-full justify-start gap-2 mt-4">
                <Trash2Icon className="size-4" />
                Apurar Grafo
              </Button>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Buscar Nós</h3>
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <button onClick={() => onSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground">
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 mt-2">
                {searchResults.slice(0, 10).map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onFocusNode(node)}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: getNodeColor(node.type) }} />
                    <span className="truncate">{node.label}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhum resultado</p>
            )}
          </div>
        )}

        {activeTab === "layers" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tipos de Nó</h3>
            {Object.entries(nodeStats).map(([type, count]) => (
              <button
                key={type}
                onClick={() => onToggleFilter(type === filterGroup ? "" : type)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                  type === filterGroup
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: getNodeColor(type) }} />
                <span className="flex-1 truncate text-left">{getTypeLabel(type)}</span>
                <span className="text-xs text-zinc-500">{count}</span>
              </button>
            ))}
            {Object.keys(nodeStats).length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhum nó no grafo</p>
            )}
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-1">
        <Button variant="ghost" size="icon" className="w-full h-6" onClick={onToggleCollapse}>
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
